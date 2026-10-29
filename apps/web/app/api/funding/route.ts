import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { createFundingLink, markFundingUsed, resolveFunding } from "@/lib/funding";
import { appendEvent, getBooking } from "@/lib/jobs";
import { getProvider, idempotencyKey } from "@/lib/payments";

export const runtime = "nodejs";
export const maxDuration = 60;

const CreateBody = z.object({ jobId: z.string().min(1).max(100) });

/** S5: customer creates a funding link (single-use, 72 h). Share via WhatsApp. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`fund:${clientKey(req)}`, 10))) {
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
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["quoted", "booked"].includes(booking.status)) return NextResponse.json({ error: "not_fundable", status: booking.status }, { status: 409 });
  const link = await createFundingLink(booking.id);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${base}/fund/${link.token}`;
  const text = encodeURIComponent(`Ayúdame a pagar esta reparación (${booking.price_usd} USD): ${url}`);
  return NextResponse.json({ link: { ...link, url, whatsapp: `https://wa.me/?text=${text}` } });
}

const PayBody = z.object({ token: z.string().min(32).max(128), payerEmail: z.string().email().max(200).optional() });

/** S5: the relative pays the escrow hold. Mock auto-approves; PayPal returns an order to approve. */
export async function PUT(req: Request) {
  if (!(await hitRateLimit(`fundpay:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = PayBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const link = await resolveFunding(parsed.data.token);
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const booking = await getBooking(link.job_id);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const provider = getProvider();
    const hold = await provider.createHold({ jobId: booking.id, amountUsd: booking.price_usd, idempotencyKey: idempotencyKey(booking.id, "fund") });
    if (provider.name === "mock") {
      const auth = await provider.approve({ orderId: hold.orderId, idempotencyKey: idempotencyKey(booking.id, "fund-auth") });
      if (booking.payment) {
        booking.payment.orderId = hold.orderId;
        booking.payment.authorizationId = auth.authorizationId;
        booking.payment.status = auth.status;
      }
      await appendEvent(booking.id, "payment_held", { provider: "mock", funder: parsed.data.payerEmail ?? "relative" });
      await markFundingUsed(link.id, parsed.data.payerEmail ?? "");
      return NextResponse.json({ job: await getBooking(booking.id), mock: true });
    }
    return NextResponse.json({ order: hold.approvalData ?? { orderId: hold.orderId }, jobId: booking.id, mock: false, sandbox: true });
  } catch (e) {
    console.error("[funding/pay] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "fund_failed" }, { status: 500 });
  }
}

const FinalBody = z.object({ token: z.string().min(32).max(128), orderId: z.string().min(1).max(200), payerEmail: z.string().email().max(200).optional() });

/** Finalize a PayPal funding payment after the relative approves. */
export async function PATCH(req: Request) {
  if (!(await hitRateLimit(`fundfinal:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = FinalBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const link = await resolveFunding(parsed.data.token);
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const provider = getProvider();
    const auth = await provider.approve({ orderId: parsed.data.orderId, idempotencyKey: idempotencyKey(link.job_id, "fund-auth") });
    const booking = await getBooking(link.job_id);
    if (booking?.payment) {
      booking.payment.orderId = parsed.data.orderId;
      booking.payment.authorizationId = auth.authorizationId;
      booking.payment.status = auth.status;
      await appendEvent(booking.id, "payment_held", { provider: provider.name, funder: parsed.data.payerEmail ?? "relative" });
    }
    await markFundingUsed(link.id, parsed.data.payerEmail ?? "");
    return NextResponse.json({ job: await getBooking(link.job_id), mock: provider.name === "mock" });
  } catch (e) {
    console.error("[funding/finalize] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "fund_failed" }, { status: 500 });
  }
}
