import { NextResponse } from "next/server";
import { z } from "zod";
import { proposeResolution } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { acceptProposal, listDisputes, listProposals, openDispute, saveProposal } from "@/lib/funding";
import { appendEvent, getBooking, transitionJob } from "@/lib/jobs";
import { getProvider, idempotencyKey } from "@/lib/payments";
import { getScanSpec } from "@/lib/scans";
import { getContractByJob, getChanges } from "@/lib/contracts";

export const runtime = "nodejs";
export const maxDuration = 60;

const OpenBody = z.object({ jobId: z.string().min(1).max(100), reason: z.string().min(10).max(2000) });

/** S6: open a dispute. Either party; admin sees all. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`dispute:${clientKey(req)}`, 10))) {
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
  const parsed = OpenBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const dispute = await openDispute(booking.id, gate.session.role, parsed.data.reason);
  await appendEvent(booking.id, "dispute_opened", { dispute_id: dispute.id, by: gate.session.role });
  return NextResponse.json({ dispute });
}

/** S6: list disputes + proposals for a job. */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const disputes = await listDisputes(jobId);
  const withProposals = await Promise.all(
    disputes.map(async (d) => ({ ...d, proposals: await listProposals(d.id) })),
  );
  return NextResponse.json({ disputes: withProposals });
}

const ProposeBody = z.object({ disputeId: z.string().min(1).max(100), jobId: z.string().min(1).max(100) });

/**
 * S6: generate the AI proposal (scope vs change orders vs verification checks).
 * The AI proposes; it never moves money — capture happens only on human accept.
 */
export async function PUT(req: Request) {
  if (!(await hitRateLimit(`mediate:${clientKey(req)}`, 10))) {
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
  const parsed = ProposeBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const disputes = await listDisputes(parsed.data.jobId);
  const dispute = disputes.find((d) => d.id === parsed.data.disputeId);
  if (!dispute) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const spec = await getScanSpec(booking.scan_id).catch(() => null);
    const contract = await getContractByJob(booking.id).catch(() => null);
    const changes = contract ? await getChanges(contract.id) : [];
    const { proposal, mock } = await proposeResolution({
      scope: spec?.steps ?? [],
      changeOrders: changes.map((c) => ({ description: c.scope_delta, price_delta_usd: c.price_delta_usd, status: c.status })),
      checks: (booking.verify_result as { checks?: { step: string; passed: boolean; evidence: string }[] } | undefined)?.checks ?? [],
      amountUsd: booking.price_usd,
    });
    const saved = await saveProposal({
      dispute_id: dispute.id,
      kind: proposal.kind,
      detail: proposal.detail,
      amount_usd: proposal.amount_usd,
      created_by: "ai",
    });
    await appendEvent(booking.id, "dispute_proposed", { dispute_id: dispute.id, kind: proposal.kind });
    return NextResponse.json({ proposal: saved, mock });
  } catch (e) {
    console.error("[disputes/propose] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "mediate_failed" }, { status: 500 });
  }
}

const DecideBody = z.object({ disputeId: z.string().min(1).max(100), jobId: z.string().min(1).max(100), proposalId: z.string().min(1).max(100), accept: z.boolean() });

/** S6: human decision. Accept a partial release → server captures the amount (final). */
export async function PATCH(req: Request) {
  if (!(await hitRateLimit(`decide:${clientKey(req)}`, 10))) {
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
  const parsed = DecideBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    if (!parsed.data.accept) {
      return NextResponse.json({ rejected: true });
    }
    const disputes = await listDisputes(parsed.data.jobId);
    const dispute = disputes.find((d) => d.id === parsed.data.disputeId);
    if (!dispute) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const proposals = await listProposals(dispute.id);
    const proposal = proposals.find((p) => p.id === parsed.data.proposalId);
    if (!proposal || proposal.status !== "pending") return NextResponse.json({ error: "not_pending" }, { status: 409 });
    // The other party (or admin) must accept — same-side accept is rejected.
    // (requestedBy is not tracked; both roles may propose, either other role accepts.)
    if (gate.session.role !== "admin" && dispute.raised_by === gate.session.role) {
      return NextResponse.json({ error: "needs_other_party" }, { status: 403 });
    }
    const ok = await acceptProposal(dispute.id, proposal.id, gate.session.role);
    if (!ok) return NextResponse.json({ error: "accept_failed" }, { status: 500 });

    if (proposal.kind === "partial_release" && proposal.amount_usd != null && booking.payment) {
      if (["succeeded", "COMPLETED"].includes(booking.payment.status)) {
        return NextResponse.json({ error: "already_captured" }, { status: 409 });
      }
      const provider = getProvider();
      const authId = booking.payment.authorizationId ?? booking.payment.stripe_pi_id;
      const cap = await provider.capture({ authorizationId: authId, amountUsd: proposal.amount_usd, idempotencyKey: idempotencyKey(booking.id, "partial") });
      const { updatePaymentStatus } = await import("@/lib/jobs");
      await updatePaymentStatus(authId, cap.status);
      await appendEvent(booking.id, "payment_released", { amount_usd: cap.capturedUsd, partial: true });
      if (booking.status !== "completed") await transitionJob(booking.id, "completed");
    } else if (proposal.kind === "redo") {
      await transitionJob(booking.id, "in_progress");
      await appendEvent(booking.id, "redo_ordered", { dispute_id: dispute.id });
    }
    return NextResponse.json({ accepted: true, kind: proposal.kind, mock: getProvider().name === "mock" });
  } catch (e) {
    console.error("[disputes/decide] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "decide_failed" }, { status: 500 });
  }
}
