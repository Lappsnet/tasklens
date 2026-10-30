import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { CITY_COOKIE, DEMO_COOKIE } from "@/lib/auth";
import { demoAllowed, isProduction } from "@/lib/env";
import { hasSupabase } from "@/lib/supabase-server";
import { CITIES } from "@/lib/cities";

export const runtime = "nodejs";

const Body = z.object({
  role: z.enum(["customer", "pro", "company", "admin", "city_operator"]),
  city_slug: z.string().min(1).max(60).optional(),
});

/**
 * Demo login (local/dev only — 404 in production or when Supabase is
 * configured; use magic link / server-side demo accounts there).
 * Rate-limited: 10 attempts/min per IP.
 */
export async function POST(req: Request) {
  if (isProduction() || hasSupabase()) return NextResponse.json({ error: "use_magic_link" }, { status: 404 });
  if (!(await hitRateLimit(`demo-login:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (parsed.data.role === "city_operator") {
    const city = CITIES.find((c) => c.slug === parsed.data.city_slug);
    if (!city) return NextResponse.json({ error: "city_required" }, { status: 400 });
  }
  const res = NextResponse.json({ role: parsed.data.role });
  res.cookies.set(DEMO_COOKIE, parsed.data.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  if (parsed.data.role === "city_operator") {
    res.cookies.set(CITY_COOKIE, parsed.data.city_slug as string, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  } else {
    res.cookies.delete(CITY_COOKIE);
  }
  return res;
}

export async function DELETE() {
  if (isProduction() || hasSupabase()) return NextResponse.json({ error: "use_magic_link" }, { status: 404 });
  const res = NextResponse.json({ logged_out: true });
  res.cookies.delete(DEMO_COOKIE);
  res.cookies.delete(CITY_COOKIE);
  return res;
}
