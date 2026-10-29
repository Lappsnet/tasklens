import { describe, expect, it } from "vitest";
import { getEvents, persistBooking, saveVerifyResult, transitionJob } from "../lib/jobs";
import { capturePayment } from "../lib/stripe";

describe("Day 5 completion + escrow release", () => {
  it("completes pending_verify → completed and captures a mock hold", async () => {
    const { jobId } = await persistBooking({
      scan_id: "s5",
      pro_id: "p5",
      price_usd: 170,
      slot: "t",
      stripe_pi_id: "pi_mock_5",
    });
    expect(await transitionJob(jobId, "en_route")).not.toBeNull();
    expect(await transitionJob(jobId, "in_progress")).not.toBeNull();
    expect(await transitionJob(jobId, "pending_verify")).not.toBeNull();
    await saveVerifyResult(jobId, { verdict: "pass", checks: [], summary: "ok" });
    const done = await transitionJob(jobId, "completed");
    expect(done?.status).toBe("completed");
    const cap = await capturePayment("pi_mock_5");
    expect(cap).toEqual({ status: "succeeded", mock: true });
    expect((await getEvents(jobId)).map((e) => e.kind)).toContain("completed");
  });

  it("refuses to complete from earlier states (no pass, no capture)", async () => {
    const { jobId } = await persistBooking({
      scan_id: "s5b",
      pro_id: "p5",
      price_usd: 100,
      slot: "t",
      stripe_pi_id: "pi_mock_5b",
    });
    expect(await transitionJob(jobId, "completed")).toBeNull();
  });
});
