import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { DEMO_COOKIE } from "@/lib/auth";
import { demoAllowed, isProduction } from "@/lib/env";
import { hasSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const Body = z.object({ role: z.enum(["customer", "pro", "admin"]) });

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
  const res = NextResponse.json({ role: parsed.data.role });
  res.cookies.set(DEMO_COOKIE, parsed.data.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function DELETE() {
  if (isProduction() || hasSupabase()) return NextResponse.json({ error: "use_magic_link" }, { status: 404 });
  const res = NextResponse.json({ logged_out: true });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
