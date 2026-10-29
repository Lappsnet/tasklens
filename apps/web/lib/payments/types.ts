/** P0-2: provider-neutral escrow interface. Primary = PayPal, secondary = Stripe, tests = mock. */

export type PayProviderName = "paypal" | "stripe" | "mock";

export interface HoldResult {
  orderId: string;
  /** PayPal approval URL / orderID for the JS SDK. Absent for mock/stripe. */
  approvalData?: { orderId: string };
  authorizationId?: string;
  status: string;
}

export interface CaptureResult {
  status: string;
  capturedUsd: number;
}

export interface WebhookEvent {
  type: string;
  orderId?: string;
  authorizationId?: string;
  captureId?: string;
  amountUsd?: number;
}

export interface PaymentProvider {
  readonly name: PayProviderName;
  /** Create a hold (PayPal: AUTHORIZE-intent order; Stripe: manual PI; mock: instant). */
  createHold(args: { jobId: string; amountUsd: number; idempotencyKey: string }): Promise<HoldResult>;
  /** Authorize after buyer approval (PayPal: authorize order → authorization id). */
  approve(args: { orderId: string; idempotencyKey: string }): Promise<{ authorizationId: string; status: string }>;
  /** Capture a held authorization. Full or partial (partial enables S6 fair-fix). */
  capture(args: { authorizationId: string; amountUsd?: number; idempotencyKey: string }): Promise<CaptureResult>;
  /** Release a hold without capturing (dispute/cancel). */
  void(args: { authorizationId: string; idempotencyKey: string }): Promise<{ status: string }>;
  /** Refund a captured payment (goes back to the payer). */
  refund(args: { captureId: string; amountUsd?: number; idempotencyKey: string }): Promise<{ status: string }>;
  /** Verify a webhook payload. Throws on bad signature. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent>;
}

/** Sandbox badge: never charge real money unless PAYPAL_ENV=live. */
export function sandboxMode(): boolean {
  return (process.env.PAYPAL_ENV ?? "sandbox") !== "live";
}
