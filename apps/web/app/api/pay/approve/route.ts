import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking, getEvents, transitionJob } from "@/lib/jobs";
import { getProvider, idempotencyKey } from "@/lib/payments";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ jobId: z.string().min(1).max(100), orderId: z.string().min(1).max(200) });

/**
 * P0-2: authorize after buyer approval. PayPal: authorize the approved order →
 * authorization id = escrow hold → job quoted→booked. Mock/Stripe: instant.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`payapprove:${clientKey(req)}`, 20))) {
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
  const { jobId, orderId } = parsed.data;

  const booking = await getBooking(jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (booking.status !== "quoted") return NextResponse.json({ error: "not_quotable", status: booking.status }, { status: 409 });
  if (!gate.session.demo && gate.session.role === "customer" && booking.customer_id && booking.customer_id !== gate.session.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const provider = getProvider();
    const auth = await provider.approve({ orderId, idempotencyKey: idempotencyKey(jobId, "authorize") });
    if (booking.payment) {
      booking.payment.authorizationId = auth.authorizationId;
      booking.payment.stripe_pi_id = auth.authorizationId;
      booking.payment.status = auth.status;
    }
    const booked = await transitionJob(jobId, "booked");
    if (!booked) return NextResponse.json({ error: "book_failed" }, { status: 500 });
    await appendEvent(jobId, "payment_held", { provider: provider.name, authorization: auth.authorizationId });
    return NextResponse.json({ job: await getBooking(jobId), events: await getEvents(jobId), mock: provider.name === "mock" });
  } catch (e) {
    console.error("[api/pay/approve] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "approve_failed" }, { status: 500 });
  }
}
