import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getBooking, persistBooking } from "@/lib/jobs";
import { getScanMeta } from "@/lib/scans";
import { getAvailability, searchPros } from "@/lib/pros";
import { getProvider, idempotencyKey, sandboxMode } from "@/lib/payments";
import { matchAndBook } from "@tasklens/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * P0-2: create a PayPal AUTHORIZE-intent order for an existing quoted/matched
 * selection. Server computes the amount from the job spec; the client only
 * sends IDs. Returns the order for the PayPal JS SDK buttons.
 * (Mock/Stripe bookings keep the atomic /api/book path.)
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`payhold:${clientKey(req)}`, 20))) {
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
  const parsed = z.object({ scanId: z.string().min(1).max(100), proId: z.string().min(1).max(100), slot: z.string().min(1).max(100) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { scanId, proId, slot } = parsed.data;

  const meta = await getScanMeta(scanId);
  if (!meta) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });
  if (!gate.session.demo && gate.session.role === "customer" && meta.customerId && meta.customerId !== gate.session.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const [lo, hi] = meta.spec.price_range_usd;
  const amountUsd = Math.max(25, Math.round((lo + hi) / 2));

  try {
    const matched = await matchAndBook(
      { spec: meta.spec, lat: 25.7617, lng: -80.1918, max_km: 25, scan_id: scanId },
      {
        search_pros: searchPros,
        get_availability: (a) => getAvailability(a.pro_id),
        create_booking: async () => {
          throw new Error("booking_not_allowed_here");
        },
      },
    );
    if (!matched.top3.some((t) => t.pro_id === proId)) {
      return NextResponse.json({ error: "pro_not_offered" }, { status: 409 });
    }
    if (!(await getAvailability(proId)).includes(slot)) {
      return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
    }
    const provider = getProvider();
    const { jobId } = await persistBooking({
      scan_id: scanId,
      customer_id: meta.customerId ?? gate.session.userId,
      pro_id: proId,
      price_usd: amountUsd,
      slot,
      status: "quoted",
      provider: provider.name,
      stripe_pi_id: "pending",
      paymentStatus: "created",
    });
    const hold = await provider.createHold({ jobId, amountUsd, idempotencyKey: idempotencyKey(jobId, "order") });
    const booking = await getBooking(jobId);
    if (booking?.payment) {
      booking.payment.orderId = hold.orderId;
      booking.payment.authorizationId = hold.authorizationId;
      booking.payment.status = hold.status;
    }
    return NextResponse.json({
      jobId,
      amountUsd,
      provider: provider.name,
      order: hold.approvalData ?? { orderId: hold.orderId },
      sandbox: sandboxMode(),
      mock: !process.env.PAYPAL_CLIENT_ID && !process.env.STRIPE_SECRET_KEY,
    });
  } catch (e) {
    console.error("[api/pay/hold] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "hold_failed" }, { status: 500 });
  }
}
