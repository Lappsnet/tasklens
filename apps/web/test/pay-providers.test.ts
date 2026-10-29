import { describe, expect, it } from "vitest";
import { MockProvider } from "../lib/payments/mock";
import { getProvider, idempotencyKey } from "../lib/payments";

describe("P0-2 payment providers (mock)", () => {
  it("selects the mock provider without keys", () => {
    expect(getProvider().name).toBe("mock");
  });

  it("builds stable idempotency keys", () => {
    expect(idempotencyKey("j1", "order")).toBe(idempotencyKey("j1", "order"));
    expect(idempotencyKey("j1", "order")).not.toBe(idempotencyKey("j1", "capture"));
  });

  it("hold -> approve -> capture", async () => {
    const p = new MockProvider();
    const hold = await p.createHold({ jobId: "job-abc", amountUsd: 170, idempotencyKey: "order-job-abc" });
    expect(hold.status).toBe("AUTHORIZED");
    const auth = await p.approve({ orderId: hold.orderId, idempotencyKey: "auth-job-abc" });
    expect(auth.authorizationId).toContain("MOCK-AUTH-");
    const cap = await p.capture({ authorizationId: auth.authorizationId, amountUsd: 170, idempotencyKey: "cap-job-abc" });
    expect(cap).toEqual({ status: "COMPLETED", capturedUsd: 170 });
  });

  it("hold -> void releases without capture", async () => {
    const p = new MockProvider();
    const hold = await p.createHold({ jobId: "job-void", amountUsd: 100, idempotencyKey: "k" });
    const v = await p.void({ authorizationId: hold.authorizationId as string, idempotencyKey: "k2" });
    expect(v.status).toBe("VOIDED");
  });

  it("approve of an unknown order fails", async () => {
    const p = new MockProvider();
    await expect(p.approve({ orderId: "MOCK-ORDER-nope", idempotencyKey: "k" })).rejects.toThrow("order_not_found");
  });

  it("capture of an unknown authorization fails (no capture without a hold)", async () => {
    const p = new MockProvider();
    await expect(
      p.capture({ authorizationId: "MOCK-AUTH-nope", idempotencyKey: "k" }),
    ).rejects.toThrow("authorization_not_found");
  });

  it("webhook rejects a bad signature", async () => {
    const p = new MockProvider();
    await expect(p.verifyWebhook("{}", {})).rejects.toThrow("bad_signature");
    const evt = await p.verifyWebhook('{"type":"X"}', { "mock-signature": "valid" });
    expect(evt.type).toBe("X");
  });
});
