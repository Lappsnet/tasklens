import { MockProvider } from "./mock";
import { PayPalProvider } from "./paypal";
import { StripeAdapter } from "./stripe";
import type { PaymentProvider } from "./types";

export * from "./types";
export { MockProvider } from "./mock";
export { PayPalProvider } from "./paypal";
export { StripeAdapter } from "./stripe";

/**
 * Provider selection. PayPal is primary; Stripe is the US-only secondary.
 * Mock is used in tests and local demo (never in production — see lib/env).
 */
export function getProvider(): PaymentProvider {
  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) return new PayPalProvider();
  if (process.env.STRIPE_SECRET_KEY) return new StripeAdapter();
  return new MockProvider();
}

export function providerName(): "paypal" | "stripe" | "mock" {
  return getProvider().name;
}

/** Idempotency key for create/capture calls: stable per (job, action). */
export function idempotencyKey(jobId: string, action: string): string {
  return `${action}-${jobId}`;
}
