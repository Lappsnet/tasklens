import { NextResponse } from "next/server";
import { updatePaymentStatus } from "@/lib/jobs";
import { verifyWebhook } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Day 3: Stripe webhook (TEST mode). Verifies the signature server-side and
 * tracks hold status. Capture on pass-verdict lands Day 5.
 */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    // No Stripe configured: acknowledge so Stripe (if ever pointed here) retries later.
    return NextResponse.json({ received: true, mock: true });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  let event;
  try {
    const raw = await req.text();
    event = verifyWebhook(raw, signature);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.amount_capturable_updated") {
      const pi = event.data.object as { id: string };
      await updatePaymentStatus(pi.id, "requires_capture");
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as { id: string };
      await updatePaymentStatus(pi.id, "succeeded");
    } else if (event.type === "payment_intent.canceled") {
      const pi = event.data.object as { id: string };
      await updatePaymentStatus(pi.id, "canceled");
    }
  } catch (e) {
    console.error("[webhook] handler failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
