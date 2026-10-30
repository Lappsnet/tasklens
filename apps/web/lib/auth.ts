import { createClient } from "@supabase/supabase-js";
import { hasSupabase, serviceClient } from "./supabase-server";
import { demoAllowed } from "./env";

export type Role = "customer" | "pro" | "company" | "admin" | "city_operator";
export interface Session {
  userId: string;
  email?: string;
  role: Role;
  demo: boolean;
  /** Operator's municipality (city_slug). Undefined for non-operators. */
  city?: string;
}

const DEMO_COOKIE = "tasklens_demo";
const CITY_COOKIE = "tasklens_city";

/** Demo session from the signed demo cookie. Disabled when Supabase is configured. */
function demoSession(req: Request): Session {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`${DEMO_COOKIE}=(customer|pro|company|admin|city_operator)`));
  const role = (m?.[1] as Role | undefined) ?? "customer";
  const c = cookie.match(new RegExp(`${CITY_COOKIE}=([a-z0-9-]+)`));
  return { userId: `demo-${role}`, role, demo: true, city: c?.[1] };
}

/**
 * Resolve the caller's session. Real mode (Supabase configured) validates the
 * Supabase JWT (Bearer header) or the cookie session (magic-link login), then
 * reads the role from profiles. Demo mode trusts the role cookie
 * (default: customer). Demo sessions are impossible in production.
 */
export async function getSession(req: Request): Promise<Session | null> {
  if (!hasSupabase()) {
    if (!demoAllowed()) return null;
    return demoSession(req);
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    // U3: cookie session (magic-link login via @supabase/ssr callback).
    try {
      const { sessionClient } = await import("./supabase-server");
      const sb = await sessionClient();
      const { data } = (await sb?.auth.getUser()) ?? {};
      if (data?.user) return sessionFromUserId(data.user.id, data.user.email ?? undefined);
    } catch (e) {
      console.error("[auth] cookie session error:", e instanceof Error ? e.message : e);
    }
    return null;
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const anonClient = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await anonClient.auth.getUser(token);
    if (error || !data.user) return null;
    return sessionFromUserId(data.user.id, data.user.email ?? undefined);
  } catch (e) {
    console.error("[auth] session error:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Shared: user id -> Session via profiles role lookup. */
async function sessionFromUserId(userId: string, email?: string): Promise<Session | null> {
  try {
    let role: Role = "customer";
    let city: string | undefined;
    const db = serviceClient();
    if (db) {
      const { data: profile } = await db.from("profiles").select("role,city_slug").eq("id", userId).single();
      const r = (profile as { role: string; city_slug?: string } | null)?.role;
      if (r === "pro" || r === "admin" || r === "customer" || r === "city_operator" || r === "company") role = r;
      if (role === "city_operator") city = (profile as { city_slug?: string } | null)?.city_slug ?? undefined;
    }
    return { userId, email, role, demo: false, city };
  } catch (e) {
    console.error("[auth] session error:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Guard helper: 401 without session, 403 without one of the roles. */
export async function requireRole(
  req: Request,
  roles: Role[],
): Promise<{ session: Session } | { response: Response }> {
  const session = await getSession(req);
  if (!session) {
    const { NextResponse } = await import("next/server");
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!roles.includes(session.role)) {
    const { NextResponse } = await import("next/server");
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { session };
}

export { DEMO_COOKIE, CITY_COOKIE };
