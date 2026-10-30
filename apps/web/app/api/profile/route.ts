import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const Body = z.object({
  display_name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30).optional(),
  city_slug: z.string().min(1).max(60).optional(),
});

/**
 * U3 Step 3: minimal profile. Demo mode is a no-op (cookie roles have no rows);
 * real mode upserts the caller's own profile row (created by the 014 trigger).
 */
export async function PATCH(req: Request) {
  if (!(await hitRateLimit(`profile:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "company", "admin", "city_operator"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (gate.session.demo) return NextResponse.json({ ok: true, demo: true });
  if (!hasSupabase()) return NextResponse.json({ error: "no_supabase" }, { status: 404 });
  try {
    const db = serviceClient();
    if (!db) return NextResponse.json({ error: "no_supabase" }, { status: 404 });
    const { error } = await db.from("profiles").upsert(
      {
        id: gate.session.userId,
        display_name: parsed.data.display_name,
        phone: parsed.data.phone ?? null,
        city_slug: parsed.data.city_slug ?? null,
      },
      { onConflict: "id" },
    );
    if (error) return NextResponse.json({ error: "profile_failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/profile] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "profile_failed" }, { status: 500 });
  }
}
