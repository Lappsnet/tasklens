import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const Body = z.object({ jobId: z.string().min(1).max(100), stars: z.number().int().min(1).max(5), comment: z.string().max(1000).default("") });

/** P0-3: 1–5 star rating after completion; updates the pro running average server-side. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`rate:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (booking.status !== "completed") return NextResponse.json({ error: "not_completed" }, { status: 409 });
  if (!gate.session.demo && gate.session.role === "customer" && booking.customer_id && booking.customer_id !== gate.session.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    if (hasSupabase()) {
      const db = serviceClient();
      if (db) {
        const { error } = await db.from("ratings").upsert({ job_id: booking.id, pro_id: booking.pro_id, stars: parsed.data.stars, comment: parsed.data.comment }, { onConflict: "job_id" });
        if (error && !error.message.includes("duplicate")) throw new Error(error.message);
        // Running average, server-side (trust score input).
        const { data: rows } = await db.from("ratings").select("stars").eq("pro_id", booking.pro_id);
        const stars = ((rows as { stars: number }[] | null) ?? []).map((r) => r.stars);
        if (stars.length > 0) {
          const avg = Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10;
          await db.from("pros").update({ rating: avg, reviews: stars.length }).eq("id", booking.pro_id);
        }
        await appendEvent(booking.id, "rated", { stars: parsed.data.stars });
        return NextResponse.json({ rated: true, mock: false });
      }
    }
    const { appendMemoryRating } = await import("@/lib/ratings");
    appendMemoryRating({ jobId: booking.id, proId: booking.pro_id, stars: parsed.data.stars });
    await appendEvent(booking.id, "rated", { stars: parsed.data.stars });
    return NextResponse.json({ rated: true, mock: true });
  } catch (e) {
    console.error("[api/ratings] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "rating_failed" }, { status: 500 });
  }
}
