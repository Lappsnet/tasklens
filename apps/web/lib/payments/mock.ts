import type { CaptureResult, HoldResult, PaymentProvider, WebhookEvent } from "./types";

/** Tests-only provider: instant holds, captures and voids. No network. */
export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;
  // Shared process-wide: a new provider is constructed per API route call, and
  // Next.js dev can evaluate this module twice — module state would split.
  // globalThis is shared by every evaluation in the process.
  private static get store(): Map<string, { amountUsd: number; status: string }> {
    const g = globalThis as unknown as { __tasklens_mock_pay?: Map<string, { amountUsd: number; status: string }> };
    return (g.__tasklens_mock_pay ??= new Map());
  }
  private get auths() {
    return MockProvider.store;
  }

  private authId(jobId: string): string {
    return `MOCK-AUTH-${jobId.slice(0, 8)}`;
  }

  async createHold(args: { jobId: string; amountUsd: number; idempotencyKey: string }): Promise<HoldResult> {
    void args.idempotencyKey;
    const orderId = `MOCK-ORDER-${args.jobId.slice(0, 8)}`;
    this.auths.set(this.authId(args.jobId), { amountUsd: args.amountUsd, status: "AUTHORIZED" });
    return { orderId, authorizationId: this.authId(args.jobId), status: "AUTHORIZED" };
  }

  async approve(args: { orderId: string; idempotencyKey: string }): Promise<{ authorizationId: string; status: string }> {
    void args.idempotencyKey;
    const jobPart = args.orderId.replace("MOCK-ORDER-", "");
    if (!this.auths.has(`MOCK-AUTH-${jobPart}`)) throw new Error("order_not_found");
    return { authorizationId: `MOCK-AUTH-${jobPart}`, status: "AUTHORIZED" };
  }

  async capture(args: { authorizationId: string; amountUsd?: number; idempotencyKey: string }): Promise<CaptureResult> {
    void args.idempotencyKey;
    const hold = this.auths.get(args.authorizationId);
    if (!hold) throw new Error("authorization_not_found");
    hold.status = "CAPTURED";
    return { status: "COMPLETED", capturedUsd: args.amountUsd ?? hold.amountUsd };
  }

  async void(args: { authorizationId: string; idempotencyKey: string }): Promise<{ status: string }> {
    void args.idempotencyKey;
    const hold = this.auths.get(args.authorizationId);
    if (!hold) throw new Error("authorization_not_found");
    hold.status = "VOIDED";
    return { status: "VOIDED" };
  }

  async refund(args: { captureId: string; amountUsd?: number; idempotencyKey: string }): Promise<{ status: string }> {
    void args;
    return { status: "COMPLETED" };
  }

  async verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent> {
    if (headers["mock-signature"] !== "valid") throw new Error("bad_signature");
    return { type: "MOCK.EVENT", ...(JSON.parse(rawBody) as object) };
  }
}
