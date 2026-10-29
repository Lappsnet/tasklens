import { createClient } from "@supabase/supabase-js";
import { hasSupabase, serviceClient } from "./supabase-server";

export type Role = "customer" | "pro" | "admin";
export interface Session {
  userId: string;
  email?: string;
  role: Role;
  demo: boolean;
}

const DEMO_COOKIE = "tasklens_demo";

/** Demo session from the signed demo cookie. Disabled when Supabase is configured. */
function demoSession(req: Request): Session {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`${DEMO_COOKIE}=(customer|pro|admin)`));
  const role = (m?.[1] as Role | undefined) ?? "customer";
  return { userId: `demo-${role}`, role, demo: true };
}

/**
 * Resolve the caller's session. Real mode (Supabase configured) validates the
 * Supabase JWT from `Authorization: Bearer …` and reads the role from profiles.
 * Demo mode trusts the demo cookie (default: customer).
 */
export async function getSession(req: Request): Promise<Session | null> {
  if (!hasSupabase()) return demoSession(req);
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const anonClient = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await anonClient.auth.getUser(token);
    if (error || !data.user) return null;
    let role: Role = "customer";
    const db = serviceClient();
    if (db) {
      const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).single();
      const r = (profile as { role: string } | null)?.role;
      if (r === "pro" || r === "admin" || r === "customer") role = r;
    }
    return { userId: data.user.id, email: data.user.email ?? undefined, role, demo: false };
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

export { DEMO_COOKIE };
