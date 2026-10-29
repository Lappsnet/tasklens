import Stripe from "stripe";
import type { CaptureResult, HoldResult, PaymentProvider, WebhookEvent } from "./types";

function client(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("stripe_not_configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

/** Secondary adapter (US merchants only): manual-capture PaymentIntents behind the interface. */
export class StripeAdapter implements PaymentProvider {
  readonly name = "stripe" as const;

  async createHold(args: { jobId: string; amountUsd: number; idempotencyKey: string }): Promise<HoldResult> {
    const pi = await client().paymentIntents.create(
      {
        amount: Math.round(args.amountUsd * 100),
        currency: "usd",
        capture_method: "manual",
        confirmation_method: "automatic",
        confirm: false,
        metadata: { job_ref: args.jobId, mode: "tasklens_escrow_hold" },
      },
      { idempotencyKey: args.idempotencyKey },
    );
    return { orderId: pi.id, authorizationId: pi.id, status: pi.status };
  }

  async approve(args: { orderId: string; idempotencyKey: string }): Promise<{ authorizationId: string; status: string }> {
    void args.idempotencyKey;
    // Stripe holds need no buyer-approval step server-side (client confirms the PI).
    return { authorizationId: args.orderId, status: "requires_capture" };
  }

  async capture(args: { authorizationId: string; amountUsd?: number; idempotencyKey: string }): Promise<CaptureResult> {
    const pi = await client().paymentIntents.capture(
      args.authorizationId,
      args.amountUsd !== undefined ? { amount_to_capture: Math.round(args.amountUsd * 100) } : {},
      { idempotencyKey: args.idempotencyKey },
    );
    return { status: pi.status, capturedUsd: (pi.amount_received ?? 0) / 100 };
  }

  async void(args: { authorizationId: string; idempotencyKey: string }): Promise<{ status: string }> {
    const pi = await client().paymentIntents.cancel(args.authorizationId, {}, { idempotencyKey: args.idempotencyKey });
    return { status: pi.status };
  }

  async refund(args: { captureId: string; amountUsd?: number; idempotencyKey: string }): Promise<{ status: string }> {
    const r = await client().refunds.create(
      {
        payment_intent: args.captureId,
        ...(args.amountUsd !== undefined ? { amount: Math.round(args.amountUsd * 100) } : {}),
      },
      { idempotencyKey: args.idempotencyKey },
    );
    return { status: r.status ?? "unknown" };
  }

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("stripe_webhook_not_configured");
    const sig = headers["stripe-signature"];
    if (!sig) throw new Error("bad_signature");
    const s = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2025-02-24.acacia" });
    const event = s.webhooks.constructEvent(rawBody, sig, secret);
    const obj = event.data.object as { id: string; amount?: number };
    return { type: event.type, authorizationId: obj.id, captureId: obj.id, amountUsd: obj.amount ? obj.amount / 100 : undefined };
  }
}
