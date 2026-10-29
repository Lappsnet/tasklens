import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchAgentInput, matchAndBook, rankPros, type MatcherTools } from "../src/match.js";
import { mockScanSpec } from "../src/muse.js";

const PROS = [
  { id: "p1", name: "A Pro", category: "plumbing", rating: 4.9 },
  { id: "p2", name: "B Pro", category: "plumbing", rating: 4.7 },
  { id: "p3", name: "C Pro", category: "electrical", rating: 5.0 },
  { id: "p4", name: "D Pro", category: "plumbing", rating: 4.8 },
];

function tools(spy?: { booked?: unknown }): MatcherTools {
  return {
    search_pros: async () => [
      { id: "p1", name: "A Pro", category: "plumbing", rating: 4.9, rate_usd_hr: 95 },
      { id: "p4", name: "D Pro", category: "plumbing", rating: 4.8, rate_usd_hr: 70 },
    ],
    get_availability: async () => ["2026-10-30T09:00"],
    create_booking: async (args) => {
      if (spy) spy.booked = args;
      return { job_id: "job-123" };
    },
  };
}

describe("rankPros (deterministic fallback)", () => {
  it("filters by category and sorts by rating desc", () => {
    const r = rankPros({ category: "plumbing", pros: PROS });
    expect(r.top3.map((t) => t.pro_id)).toEqual(["p1", "p4", "p2"]);
  });

  it("caps at 3 and never returns an empty reason", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `x${i}`,
      name: `P${i}`,
      category: "cleaning",
      rating: 4.0 + (i % 10) / 10,
    }));
    const r = rankPros({ category: "cleaning", pros: many });
    expect(r.top3).toHaveLength(3);
    for (const t of r.top3) expect(t.reason.length).toBeGreaterThan(0);
  });
});

describe("matchAndBook mock path (no API key)", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("MODEL_API_KEY", "");
  });

  it("ranks top 3 with server-side quotes and no booking without confirm", async () => {
    const input = MatchAgentInput.parse({ spec: mockScanSpec(), scan_id: "scan-1" });
    const out = await matchAndBook(input, tools());
    expect(out.mock).toBe(true);
    expect(out.top3).toHaveLength(2);
    // Day 3 pricing: rate_usd_hr * est_hours → 95 * 1.5 = 142.5 → 143.
    expect(out.top3[0].quote_usd).toBe(143);
    expect(out.booking).toBeNull();
  });

  it("books only the confirmed pro/slot and passes scan_id through", async () => {
    const spy: { booked?: unknown } = {};
    const input = MatchAgentInput.parse({
      spec: mockScanSpec(),
      scan_id: "scan-9",
      confirm: { pro_id: "p4", slot: "2026-10-30T09:00" },
    });
    const out = await matchAndBook(input, tools(spy));
    expect(out.booking).toEqual({ job_id: "job-123", pro_id: "p4", slot: "2026-10-30T09:00" });
    expect(spy.booked).toMatchObject({ pro_id: "p4", slot: "2026-10-30T09:00", scan_id: "scan-9" });
  });

  it("rejects booking input without explicit confirmation", () => {
    expect(() =>
      MatchAgentInput.parse({ spec: mockScanSpec(), scan_id: "s", confirm: { pro_id: "p1" } }),
    ).toThrow();
  });
});
