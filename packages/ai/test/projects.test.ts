import { describe, expect, it } from "vitest";
import { ProjectPlan, draftProjectPlan, mockProjectPlan } from "../src/projects.js";
import { mockScanSpec } from "../src/muse.js";

describe("S4 mockProjectPlan", () => {
  it("validates and orders 5 phases by trade", () => {
    const p = mockProjectPlan({ spec: mockScanSpec(), transcript: "remodel this bath" });
    expect(ProjectPlan.safeParse(p).success).toBe(true);
    expect(p.phases).toHaveLength(5);
    expect(p.phases[0].trade).toBe("plumbing");
    expect(p.phases[p.phases.length - 1].trade).toBe("assembly");
    expect(p.total_low_usd).toBeLessThanOrEqual(p.total_high_usd);
  });

  it("falls back to mock without a key", async () => {
    const out = await draftProjectPlan({ spec: mockScanSpec(), transcript: "", images: [] });
    expect(out.mock).toBe(true);
    expect(out.plan.phases.length).toBe(5);
  });
});
