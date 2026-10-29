import { NextResponse } from "next/server";
import { updatePaymentStatus } from "@/lib/jobs";
import { getProvider } from "@/lib/payments";

export const runtime = "nodejs";

/** P0-2: PayPal (or Stripe) webhooks. Signature verified server-side, then tracked. */
export async function POST(req: Request) {
  const provider = getProvider();
  if (provider.name === "mock") {
    // Mock provider has no webhooks; acknowledge so nothing retries.
    return NextResponse.json({ received: true, mock: true });
  }
  const raw = await req.text();
  const headers: Record<string, string> = {};
  for (const k of ["paypal-transmission-id", "paypal-transmission-time", "paypal-cert-url", "paypal-auth-algo", "paypal-transmission-sig", "stripe-signature"]) {
    const v = req.headers.get(k);
    if (v) headers[k] = v;
  }
  let event;
  try {
    event = await provider.verifyWebhook(raw, headers);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    if (event.authorizationId) {
      if (/VOID|CANCEL/i.test(event.type)) await updatePaymentStatus(event.authorizationId, "voided");
      else if (/CAPTURED|COMPLETED|SUCCEEDED/i.test(event.type)) await updatePaymentStatus(event.authorizationId, "succeeded");
      else await updatePaymentStatus(event.authorizationId, event.type);
    }
  } catch (e) {
    console.error("[pay/webhook] handler failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
