import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * U3 magic-link callback: exchanges the code for a cookie session, then
 * redirects to the user's role home. New users land on /signup to finish
 * their minimal profile (the 014 trigger already created a customer row).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const res = NextResponse.redirect(new URL("/signup", url.origin));
  if (!code) return res;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !anon) return NextResponse.json({ error: "no_supabase" }, { status: 404 });
  const sb = createServerClient(supaUrl, anon, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(toSet) {
        toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=link", url.origin));
  }
  return res;
}
