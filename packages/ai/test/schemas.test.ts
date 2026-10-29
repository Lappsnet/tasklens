import { describe, expect, it } from "vitest";
import { AiSpec, VerifyResult, JobCategory } from "../src/schemas.js";
import { mockScanSpec } from "../src/muse.js";

describe("AiSpec schema (Day 1/2 AI contract)", () => {
  it("accepts the deterministic mock spec", () => {
    expect(AiSpec.safeParse(mockScanSpec()).success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const bad = { ...mockScanSpec(), category: "roofing" };
    expect(AiSpec.safeParse(bad).success).toBe(false);
  });

  it("rejects confidence outside 0..1", () => {
    expect(AiSpec.safeParse({ ...mockScanSpec(), confidence: 1.5 }).success).toBe(false);
  });

  it("rejects a price tuple with the wrong length", () => {
    expect(AiSpec.safeParse({ ...mockScanSpec(), price_range_usd: [100] }).success).toBe(false);
  });

  it("rejects damage_box values outside 0..1", () => {
    const bad = { ...mockScanSpec(), damage_box: { x: 0.1, y: 0.1, w: 2, h: 0.2 } };
    expect(AiSpec.safeParse(bad).success).toBe(false);
  });

  it("allows all six job categories", () => {
    for (const c of ["plumbing", "electrical", "appliance", "drywall_paint", "assembly", "cleaning"]) {
      expect(JobCategory.safeParse(c).success).toBe(true);
    }
  });
});

describe("VerifyResult schema (Day 5 contract, pinned early)", () => {
  it("accepts a well-formed verdict", () => {
    const ok = {
      verdict: "pass",
      checks: [{ step: "Replace P-trap", passed: true, evidence: "dry cabinet floor" }],
      summary: "Leak fixed, no drips.",
    };
    expect(VerifyResult.safeParse(ok).success).toBe(true);
  });

  it("rejects an unknown verdict", () => {
    expect(
      VerifyResult.safeParse({ verdict: "maybe", checks: [], summary: "x" }).success,
    ).toBe(false);
  });
});
