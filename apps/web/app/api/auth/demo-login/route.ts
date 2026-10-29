import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { hasSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const Body = z.object({ role: z.enum(["customer", "pro"]) });

/**
 * P0-1: production "Try as customer / Try as pro" buttons. Signs in to the
 * seeded demo accounts server-side (rate-limited) and returns tokens for the
 * browser client to establish its session. Admin is never one click.
 * 404 unless Supabase + demo account env are configured.
 */
export async function POST(req: Request) {
  if (!hasSupabase()) return NextResponse.json({ error: "no_supabase" }, { status: 404 });
  if (!(await hitRateLimit(`demo-login:${clientKey(req)}`, 5, 60_000))) {
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

  const email =
    parsed.data.role === "customer" ? process.env.DEMO_CUSTOMER_EMAIL : process.env.DEMO_PRO_EMAIL;
  const password =
    parsed.data.role === "customer"
      ? process.env.DEMO_CUSTOMER_PASSWORD
      : process.env.DEMO_PRO_PASSWORD;
  if (!email || !password) return NextResponse.json({ error: "demo_not_configured" }, { status: 404 });

  try {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false } },
    );
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) return NextResponse.json({ error: "demo_unavailable" }, { status: 503 });
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      role: parsed.data.role,
    });
  } catch (e) {
    console.error("[auth/demo-login] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "demo_failed" }, { status: 500 });
  }
}
