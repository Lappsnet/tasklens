import Stripe from "stripe";

let cached: Stripe | null = null;

/** Stripe TEST mode client. Null when no key is configured (DEMO mock path). */
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cached;
}

export interface HeldPayment {
  piId: string;
  status: string;
  amountUsd: number;
  mock: boolean;
}

/**
 * Escrow hold: PaymentIntent with capture_method=manual. Amount is computed
 * server-side by the caller (never taken from the client).
 */
export async function holdPayment(args: { amountUsd: number; jobRef: string }): Promise<HeldPayment> {
  const stripe = stripeClient();
  if (!stripe) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      piId: `pi_mock_${args.jobRef.slice(0, 8)}`,
      status: "requires_capture",
      amountUsd: args.amountUsd,
      mock: true,
    };
  }
  const pi = await stripe.paymentIntents.create({
    amount: Math.round(args.amountUsd * 100),
    currency: "usd",
    capture_method: "manual",
    confirmation_method: "automatic",
    confirm: false, // customer confirms on the client (Day 3 demo holds without charging)
    metadata: { job_ref: args.jobRef, mode: "tasklens_escrow_hold" },
  });
  return { piId: pi.id, status: pi.status, amountUsd: args.amountUsd, mock: false };
}

/** Release escrow: capture a manually-held PaymentIntent. Only called on a pass verdict. */
export async function capturePayment(piId: string): Promise<{ status: string; mock: boolean }> {
  const stripe = stripeClient();
  if (!stripe || piId.startsWith("pi_mock_")) {
    await new Promise((r) => setTimeout(r, 300));
    return { status: "succeeded", mock: true };
  }
  const pi = await stripe.paymentIntents.capture(piId);
  return { status: pi.status, mock: false };
}

/** Verify a Stripe webhook signature; throws on mismatch. */
export function verifyWebhook(rawBody: string | Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) throw new Error("stripe not configured");
  // Key is only used for client construction — verification is local HMAC.
  const s = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return s.webhooks.constructEvent(rawBody, signature, secret);
}
