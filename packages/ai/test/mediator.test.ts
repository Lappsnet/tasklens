import { describe, expect, it } from "vitest";
import { proposeResolution } from "../src/mediator.js";

describe("S6 proposeResolution", () => {
  it("proposes redo when checks failed", async () => {
    const out = await proposeResolution({
      scope: ["Fix sink"],
      changeOrders: [],
      checks: [{ step: "Fix sink", passed: false, evidence: "still leaking" }],
      amountUsd: 170,
    });
    expect(out.proposal.kind).toBe("redo");
    expect(out.proposal.amount_usd).toBeNull();
    expect(out.mock).toBe(true);
  });

  it("proposes partial release when checks pass but job is disputed", async () => {
    const out = await proposeResolution({
      scope: ["Fix sink"],
      changeOrders: [],
      checks: [{ step: "Fix sink", passed: true, evidence: "dry" }],
      amountUsd: 200,
    });
    expect(out.proposal.kind).toBe("partial_release");
    expect(out.proposal.amount_usd).toBe(140);
  });
});
