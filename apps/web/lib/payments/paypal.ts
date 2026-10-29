import type { CaptureResult, HoldResult, PaymentProvider, WebhookEvent } from "./types";

function baseUrl(): string {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

let tokenCache: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("paypal_not_configured");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`paypal_auth_failed_${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, exp: Date.now() + (json.expires_in - 60) * 1000 };
  return tokenCache.token;
}

async function paypalFetch(path: string, init: RequestInit & { idempotencyKey?: string }): Promise<unknown> {
  const token = await accessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers["PayPal-Request-Id"] = init.idempotencyKey;
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`paypal_${res.status}_${text.slice(0, 200)}`);
  return text ? (JSON.parse(text) as unknown) : {};
}

/** Primary provider: PayPal Orders v2 with intent AUTHORIZE = escrow hold. */
export class PayPalProvider implements PaymentProvider {
  readonly name = "paypal" as const;

  async createHold(args: { jobId: string; amountUsd: number; idempotencyKey: string }): Promise<HoldResult> {
    const order = (await paypalFetch("/v2/checkout/orders", {
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            reference_id: args.jobId,
            amount: { currency_code: "USD", value: args.amountUsd.toFixed(2) },
            description: `TaskLens escrow hold for job ${args.jobId.slice(0, 8)}`,
          },
        ],
      }),
    })) as { id: string; status: string };
    return { orderId: order.id, approvalData: { orderId: order.id }, status: order.status };
  }

  async approve(args: { orderId: string; idempotencyKey: string }): Promise<{ authorizationId: string; status: string }> {
    const auth = (await paypalFetch(`/v2/checkout/orders/${args.orderId}/authorize`, {
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: "{}",
    })) as {
      purchase_units: { payments: { authorizations: { id: string; status: string }[] } }[];
    };
    const a = auth.purchase_units?.[0]?.payments?.authorizations?.[0];
    if (!a) throw new Error("paypal_authorize_empty");
    return { authorizationId: a.id, status: a.status };
  }

  async capture(args: { authorizationId: string; amountUsd?: number; idempotencyKey: string }): Promise<CaptureResult> {
    const cap = (await paypalFetch(`/v2/payments/authorizations/${args.authorizationId}/capture`, {
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: JSON.stringify(
        args.amountUsd !== undefined
          ? { amount: { currency_code: "USD", value: args.amountUsd.toFixed(2) }, final_capture: true }
          : {},
      ),
    })) as { status: string; amount?: { value: string } };
    return { status: cap.status, capturedUsd: Number(cap.amount?.value ?? args.amountUsd ?? 0) };
  }

  async void(args: { authorizationId: string; idempotencyKey: string }): Promise<{ status: string }> {
    await paypalFetch(`/v2/payments/authorizations/${args.authorizationId}/void`, {
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: "{}",
    });
    return { status: "VOIDED" };
  }

  async refund(args: { captureId: string; amountUsd?: number; idempotencyKey: string }): Promise<{ status: string }> {
    const r = (await paypalFetch(`/v2/payments/captures/${args.captureId}/refund`, {
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: JSON.stringify(
        args.amountUsd !== undefined
          ? { amount: { currency_code: "USD", value: args.amountUsd.toFixed(2) } }
          : {},
      ),
    })) as { status: string };
    return { status: r.status };
  }

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) throw new Error("paypal_webhook_not_configured");
    const verify = (await paypalFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        transmission_id: headers["paypal-transmission-id"],
        transmission_time: headers["paypal-transmission-time"],
        cert_url: headers["paypal-cert-url"],
        auth_algo: headers["paypal-auth-algo"],
        transmission_sig: headers["paypal-transmission-sig"],
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody) as unknown,
      }),
    })) as { verification_status: string };
    if (verify.verification_status !== "SUCCESS") throw new Error("bad_signature");
    const evt = JSON.parse(rawBody) as {
      event_type: string;
      resource?: { id?: string; supplementary_data?: { related_ids?: { authorization_id?: string } }; amount?: { value?: string } };
    };
    return {
      type: evt.event_type,
      authorizationId: evt.resource?.id ?? evt.resource?.supplementary_data?.related_ids?.authorization_id,
      captureId: evt.resource?.id,
      amountUsd: evt.resource?.amount?.value ? Number(evt.resource.amount.value) : undefined,
    };
  }
}
