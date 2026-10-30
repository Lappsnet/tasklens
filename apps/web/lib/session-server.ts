import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Role } from "./auth";
import { hasSupabase, serviceClient } from "./supabase-server";

/** Session shape shared by server layouts and their chrome props. */
export interface ServerSession {
  userId: string;
  role: Role;
  demo: boolean;
  city?: string;
}

/**
 * F2.5: read the session once on the server (group layouts) and pass it down
 * as props — one source of truth, no duplicate /api/auth/me fetches.
 * Mirrors lib/auth.ts logic (demo cookies when Supabase is unconfigured).
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon && hasSupabase()) {
    const sb = createServerClient(url, anon, {
      cookies: {
        getAll: () => jar.getAll(),
        // Refresh happens in middleware; layouts never set cookies.
        setAll: () => {},
      },
    });
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return null;
    let role: Role = "customer";
    let city: string | undefined;
    const db = serviceClient();
    if (db) {
      const { data: profile } = await db.from("profiles").select("role,city_slug").eq("id", data.user.id).single();
      const r = (profile as { role: string; city_slug?: string } | null)?.role;
      if (r === "pro" || r === "admin" || r === "customer" || r === "city_operator") role = r;
      if (role === "city_operator") city = (profile as { city_slug?: string } | null)?.city_slug ?? undefined;
    }
    return { userId: data.user.id, role, demo: false, city };
  }
  const roleCookie = jar.get("tasklens_demo")?.value;
  const role = (["customer", "pro", "admin", "city_operator"] as Role[]).includes(roleCookie as Role)
    ? (roleCookie as Role)
    : "customer";
  const city = jar.get("tasklens_city")?.value;
  return { userId: `demo-${role}`, role, demo: true, city };
}
