import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking, persistBooking } from "@/lib/jobs";
import { getProject, listPhases, updatePhase } from "@/lib/projects";
import { getAvailability, searchPros } from "@/lib/pros";
import { getProvider, idempotencyKey } from "@/lib/payments";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ projectId: z.string().min(1).max(100) });

/** S4: book one pro per trade in sequence; each phase gets its own escrow hold. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`crew:${clientKey(req)}`, 10))) {
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

  const project = await getProject(parsed.data.projectId);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const provider = getProvider();
    const phases = await listPhases(project.id);
    const crew = [];
    let dayOffset = 1;
    for (const phase of phases) {
      const pros = await searchPros({ category: phase.trade, lat: 13.6929, lng: -89.2182, max_km: 40 });
      const pro = pros[0];
      if (!pro) {
        crew.push({ phaseId: phase.id, trade: phase.trade, booked: false, reason: "no_pros" });
        continue;
      }
      const slots = await getAvailability(pro.id);
      const slot = slots[Math.min(dayOffset - 1, slots.length - 1)] ?? new Date(Date.now() + dayOffset * 86400_000).toISOString().slice(0, 16);
      const amount = Math.max(25, Math.round((phase.budget_low_usd + phase.budget_high_usd) / 2));
      const { jobId } = await persistBooking({
        scan_id: "",
        customer_id: gate.session.demo ? undefined : gate.session.userId,
        pro_id: pro.id,
        price_usd: amount,
        slot,
        status: "quoted",
        provider: provider.name,
        stripe_pi_id: "pending",
        paymentStatus: "created",
      });
      const hold = await provider.createHold({ jobId, amountUsd: amount, idempotencyKey: idempotencyKey(jobId, "phase") });
      const auth = await provider.approve({ orderId: hold.orderId, idempotencyKey: idempotencyKey(jobId, "phase-auth") });
      const booking = await getBooking(jobId);
      if (booking?.payment) {
        booking.payment.orderId = hold.orderId;
        booking.payment.authorizationId = auth.authorizationId;
        booking.payment.status = auth.status;
      }
      await appendEvent(jobId, "payment_held", { provider: provider.name, phase: phase.id });
      const { transitionJob } = await import("@/lib/jobs");
      await transitionJob(jobId, "booked");
      await updatePhase(project.id, phase.id, { job_id: jobId, status: "booked" });
      crew.push({ phaseId: phase.id, trade: phase.trade, booked: true, jobId, proId: pro.id, slot, amountUsd: amount });
      dayOffset += Math.max(1, Math.ceil(phase.est_days));
    }
    return NextResponse.json({ crew, mock: provider.name === "mock" });
  } catch (e) {
    console.error("[projects/crew] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "crew_failed" }, { status: 500 });
  }
}
