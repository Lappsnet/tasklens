import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";
import { getProvider, idempotencyKey } from "@/lib/payments";

export const runtime = "nodejs";

const Body = z.object({ jobId: z.string().min(1).max(100) });

/** P0-2: void a hold (dispute/cancel). The job stays quoted so it can be rebooked. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`payvoid:${clientKey(req)}`, 10))) {
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
  if (!["quoted", "booked"].includes(booking.status)) {
    return NextResponse.json({ error: "not_voidable", status: booking.status }, { status: 409 });
  }
  if (!gate.session.demo && gate.session.role === "customer" && booking.customer_id && booking.customer_id !== gate.session.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const authId = booking.payment?.authorizationId ?? booking.payment?.stripe_pi_id;
  if (!authId || authId === "pending") return NextResponse.json({ error: "nothing_to_void" }, { status: 409 });

  try {
    const provider = getProvider();
    const r = await provider.void({ authorizationId: authId, idempotencyKey: idempotencyKey(booking.id, "void") });
    if (booking.payment) booking.payment.status = r.status;
    await appendEvent(booking.id, "payment_voided", { provider: provider.name });
    return NextResponse.json({ jobId: booking.id, status: r.status, mock: provider.name === "mock" });
  } catch (e) {
    console.error("[api/pay/void] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "void_failed" }, { status: 500 });
  }
}
