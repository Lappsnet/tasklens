import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const gs = globalThis as unknown as { __tasklens_resched?: Map<string, { newSlot: string; requestedBy: string }> };
const pending = (gs.__tasklens_resched ??= new Map<string, { newSlot: string; requestedBy: string }>());

const ReqBody = z.object({ jobId: z.string().min(1).max(100), newSlot: z.string().min(1).max(100) });

/** S2: reschedule request (either party). Approval must come from the other side or admin. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`resched:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = ReqBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const booking = await getBooking(parsed.data.jobId);
  if (!booking || !["quoted", "booked"].includes(booking.status)) {
    return NextResponse.json({ error: "not_reschedulable" }, { status: 409 });
  }
  pending.set(parsed.data.jobId, { newSlot: parsed.data.newSlot, requestedBy: gate.session.role });
  await appendEvent(parsed.data.jobId, "reschedule_requested", { newSlot: parsed.data.newSlot, by: gate.session.role });
  return NextResponse.json({ requested: true });
}

const ApproveBody = z.object({ jobId: z.string().min(1).max(100) });

/** Approve: applies the new slot. Moves >3 days flag a PayPal re-authorization. */
export async function PUT(req: Request) {
  if (!(await hitRateLimit(`reschedok:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = ApproveBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const p = pending.get(parsed.data.jobId);
  if (!p) return NextResponse.json({ error: "nothing_pending" }, { status: 409 });
  if (gate.session.role !== "admin" && p.requestedBy === gate.session.role) {
    return NextResponse.json({ error: "needs_other_party" }, { status: 403 });
  }
  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const oldDate = booking.slot ? new Date(booking.slot) : new Date();
  const newDate = new Date(p.newSlot);
  const daysOut = Math.abs(newDate.getTime() - oldDate.getTime()) / 86400_000;
  booking.slot = p.newSlot;
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) await db.from("jobs").update({ slot: p.newSlot }).eq("id", booking.id);
    } catch (e) {
      console.error("[reschedule] db error:", e instanceof Error ? e.message : e);
    }
  }
  pending.delete(parsed.data.jobId);
  await appendEvent(parsed.data.jobId, "rescheduled", { newSlot: p.newSlot, reauthorize: daysOut > 3 });
  return NextResponse.json({ slot: p.newSlot, reauthorizeRequired: daysOut > 3 });
}
