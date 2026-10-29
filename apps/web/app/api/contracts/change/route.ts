import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getChanges, getContractByJob, saveChangeOrder } from "@/lib/contracts";
import { appendEvent } from "@/lib/jobs";
import { getProvider, idempotencyKey } from "@/lib/payments";

export const runtime = "nodejs";
export const maxDuration = 60;

/** List change orders for a job's contract. */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const contract = await getContractByJob(jobId);
  if (!contract) return NextResponse.json({ changes: [] });
  return NextResponse.json({ changes: await getChanges(contract.id) });
}

const ProposeBody = z.object({
  jobId: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
  scopeDelta: z.string().min(10).max(2000),
  priceDeltaUsd: z.number().int().min(0).max(100000),
  timeDeltaHours: z.number().min(0).max(200),
});

/** S1: pro proposes a change order (extra work found on site). */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`change:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = ProposeBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const contract = await getContractByJob(parsed.data.jobId);
  if (!contract) return NextResponse.json({ error: "no_contract" }, { status: 409 });
  try {
    const change = await saveChangeOrder({
      contract_id: contract.id,
      description: parsed.data.description,
      scope_delta: parsed.data.scopeDelta,
      price_delta_usd: parsed.data.priceDeltaUsd,
      time_delta_hours: parsed.data.timeDeltaHours,
      status: "proposed",
    });
    await appendEvent(parsed.data.jobId, "change_proposed", { change_id: change.id, price_delta_usd: change.price_delta_usd });
    return NextResponse.json({ change, mock: getProvider().name === "mock" });
  } catch (e) {
    console.error("[change/propose] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "change_failed" }, { status: 500 });
  }
}

const ApproveBody = z.object({ jobId: z.string().min(1).max(100), changeId: z.string().min(1).max(100) });

/**
 * Customer approves with one tap (+ signature done on the contract page).
 * Mock: escrow delta authorized instantly. PayPal: returns the delta order for
 * buyer approval, then POST /api/contracts/change/finalize authorizes it.
 */
export async function PUT(req: Request) {
  if (!(await hitRateLimit(`changeapprove:${clientKey(req)}`, 10))) {
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
  const parsed = ApproveBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const contract = await getContractByJob(parsed.data.jobId);
  if (!contract) return NextResponse.json({ error: "no_contract" }, { status: 409 });
  const list = await getChanges(contract.id);
  const change = list.find((c) => c.id === parsed.data.changeId);
  if (!change || change.status !== "proposed") return NextResponse.json({ error: "not_proposed" }, { status: 409 });

  try {
    const provider = getProvider();
    if (change.price_delta_usd <= 0) {
      const updated = await saveChangeOrder({ ...change, status: "approved" });
      await appendEvent(parsed.data.jobId, "change_approved", { change_id: change.id });
      return NextResponse.json({ change: updated, mock: provider.name === "mock" });
    }
    const hold = await provider.createHold({
      jobId: `${parsed.data.jobId}-delta`,
      amountUsd: change.price_delta_usd,
      idempotencyKey: idempotencyKey(change.id, "delta-order"),
    });
    if (provider.name === "mock") {
      const auth = await provider.approve({ orderId: hold.orderId, idempotencyKey: idempotencyKey(change.id, "delta-auth") });
      const updated = await saveChangeOrder({ ...change, status: "approved", orderId: hold.orderId, authorizationId: auth.authorizationId });
      await appendEvent(parsed.data.jobId, "change_approved", { change_id: change.id, authorization: auth.authorizationId });
      return NextResponse.json({ change: updated, mock: true });
    }
    const updated = await saveChangeOrder({ ...change, orderId: hold.orderId });
    return NextResponse.json({ change: updated, order: hold.approvalData ?? { orderId: hold.orderId }, sandbox: true, mock: false });
  } catch (e) {
    console.error("[change/approve] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "change_failed" }, { status: 500 });
  }
}

const FinalBody = z.object({ jobId: z.string().min(1).max(100), changeId: z.string().min(1).max(100), orderId: z.string().min(1).max(200) });

/** Finalize a PayPal delta authorization after buyer approval. Mock: no-op pass-through. */
export async function PATCH(req: Request) {
  if (!(await hitRateLimit(`changefinal:${clientKey(req)}`, 10))) {
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
  const parsed = FinalBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const contract = await getContractByJob(parsed.data.jobId);
  if (!contract) return NextResponse.json({ error: "no_contract" }, { status: 409 });
  const list = await getChanges(contract.id);
  const change = list.find((c) => c.id === parsed.data.changeId);
  if (!change || change.status !== "proposed") return NextResponse.json({ error: "not_proposed" }, { status: 409 });

  try {
    const provider = getProvider();
    const auth = await provider.approve({ orderId: parsed.data.orderId, idempotencyKey: idempotencyKey(change.id, "delta-auth") });
    const updated = await saveChangeOrder({ ...change, status: "approved", orderId: parsed.data.orderId, authorizationId: auth.authorizationId });
    await appendEvent(parsed.data.jobId, "change_approved", { change_id: change.id, authorization: auth.authorizationId });
    return NextResponse.json({ change: updated, mock: provider.name === "mock" });
  } catch (e) {
    console.error("[change/finalize] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "change_failed" }, { status: 500 });
  }
}
