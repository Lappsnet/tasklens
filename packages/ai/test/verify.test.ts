import { describe, expect, it } from "vitest";
import { VerifyResult } from "../src/schemas.js";
import { mockScanSpec, mockVerifyResult } from "../src/muse.js";

describe("mockVerifyResult (Day 5 demo verdict)", () => {
  it("validates against the VerifyResult contract and passes", () => {
    const v = mockVerifyResult(mockScanSpec());
    expect(VerifyResult.safeParse(v).success).toBe(true);
    expect(v.verdict).toBe("pass");
    expect(v.checks.length).toBe(mockScanSpec().steps.length);
    expect(v.checks.every((c) => c.passed)).toBe(true);
  });
});
