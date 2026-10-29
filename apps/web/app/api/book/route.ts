import { NextResponse } from "next/server";
import { z } from "zod";
import { matchAndBook } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getScanMeta } from "@/lib/scans";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";
import { getAvailability, searchPros } from "@/lib/pros";
import { getBooking, persistBooking, visibleJobs } from "@/lib/jobs";
import { holdPayment } from "@/lib/stripe";
import { getProvider, idempotencyKey, sandboxMode } from "@/lib/payments";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  scanId: z.string().min(1).max(100),
  proId: z.string().min(1).max(100),
  slot: z.string().min(1).max(100),
  lat: z.number().min(-90).max(90).default(13.6929),
  lng: z.number().min(-180).max(180).default(-89.2182),
  // Explicit customer confirmation — booking is rejected without literal true.
  confirm: z.literal(true, { errorMap: () => ({ message: "confirmation_required" }) }),
});

async function loadScan(scanId: string) {
  const meta = await getScanMeta(scanId);
  if (!meta) return null;
  if (hasSupabase()) return { spec: meta.spec, customerId: meta.customerId, mock: false as const };
  const mem = meta;
  return { spec: mem.spec, customerId: mem.customerId, mock: true as const };
}

/**
 * Book a pro + hold escrow. Amount is computed server-side from the scan's
 * price range (spec midpoint), never taken from the client.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`book:${clientKey(req)}`, 20))) {
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
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code = issue?.path.includes("confirm") ? "confirmation_required" : "bad_request";
    return NextResponse.json({ error: code }, { status: 400 });
  }
  const { scanId, proId, slot, lat, lng } = parsed.data;

  const scan = await loadScan(scanId);
  if (!scan) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });
  // Ownership: real mode restricts customers to their own scans.
  if (!gate.session.demo && gate.session.role === "customer") {
    if (scan.customerId && scan.customerId !== gate.session.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  try {
    // Re-run matching server-side so proId must be one of the ranked top 3 —
    // a client can't book an arbitrary pro.
    const matched = await matchAndBook(
      { spec: scan.spec, lat, lng, max_km: 25, scan_id: scanId },
      {
        search_pros: (a) => searchPros(a),
        get_availability: (a) => getAvailability(a.pro_id),
        create_booking: async () => {
          throw new Error("booking_not_allowed_here");
        },
      },
    );
    const pick = matched.top3.find((t) => t.pro_id === proId);
    if (!pick) return NextResponse.json({ error: "pro_not_offered" }, { status: 409 });

    const slots = await getAvailability(proId);
    if (!slots.includes(slot)) return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });

    // Server-side amount: midpoint of the AI price range, whole dollars.
    const [lo, hi] = scan.spec.price_range_usd;
    const amountUsd = Math.max(25, Math.round((lo + hi) / 2));
    const provider = getProvider();

    // PayPal flow: create the quoted job + order here; the buyer approves in
    // the PayPal UI and POST /api/pay/approve authorizes (job → booked).
    if (provider.name === "paypal") {
      const { jobId, mock: storeMock } = await persistBooking({
        scan_id: scanId,
        customer_id: scan.customerId ?? gate.session.userId,
        pro_id: proId,
        price_usd: amountUsd,
        slot,
        status: "quoted",
        provider: "paypal",
        stripe_pi_id: "pending",
        paymentStatus: "created",
      });
      const hold = await provider.createHold({ jobId, amountUsd, idempotencyKey: idempotencyKey(jobId, "order") });
      const created = await getBooking(jobId);
      if (created?.payment) {
        created.payment.orderId = hold.orderId;
        created.payment.status = hold.status;
      }
      return NextResponse.json({
        jobId,
        proId,
        slot,
        amountUsd,
        provider: "paypal",
        order: hold.approvalData ?? { orderId: hold.orderId },
        sandbox: sandboxMode(),
        mock: scan.mock || storeMock,
        testMode: true,
      });
    }

    // Mock/Stripe flow: atomic book + hold (unchanged legacy behavior).
    const { jobId, mock: storeMock } = await persistBooking({
      scan_id: scanId,
      customer_id: scan.customerId ?? gate.session.userId,
      pro_id: proId,
      price_usd: amountUsd,
      slot,
      provider: provider.name,
      stripe_pi_id: "pending",
    });
    const held = await holdPayment({ amountUsd, jobRef: jobId });
    // Record the real PI id on the payment row (memory store helper path).
    if (hasSupabase()) {
      const db = serviceClient();
      if (db) await db.from("payments").update({ stripe_pi_id: held.piId }).eq("job_id", jobId);
    } else {
      const { getMemoryPaymentByJob } = await import("@/lib/jobs");
      const pay = getMemoryPaymentByJob(jobId);
      if (pay) pay.stripe_pi_id = held.piId;
    }

    return NextResponse.json({
      jobId,
      proId,
      slot,
      amountUsd,
      payment: { piId: held.piId, status: held.status },
      mock: scan.mock || storeMock || held.mock,
      testMode: true,
    });
  } catch (e) {
    console.error("[api/book] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "book_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const job = await getBooking(id);
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (visibleJobs([job], gate.session).length === 0) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(job);
}
