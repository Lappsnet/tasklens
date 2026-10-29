import { describe, expect, it } from "vitest";
import { briefDay, distanceKm, suggestSlots } from "../src/schedule.js";
import { radarSuggestions } from "../src/home.js";
import { mockScanSpec } from "../src/muse.js";

describe("S2 suggestSlots", () => {
  it("ranks nearest first with reasons and ETAs", async () => {
    const out = await suggestSlots({
      spec: mockScanSpec(),
      candidates: [
        { slot: "2026-10-30T09:00", proLat: 25.78, proLng: -80.19 },
        { slot: "2026-10-30T14:00", proLat: 25.7617, proLng: -80.1918 },
      ],
      homeLat: 25.7617,
      homeLng: -80.1918,
      busySlots: [],
    });
    expect(out.slots.length).toBe(2);
    expect(out.slots[0].slot).toBe("2026-10-30T14:00");
    expect(out.slots[0].reason.length).toBeGreaterThan(5);
    expect(out.mock).toBe(true);
  });

  it("skips busy slots", async () => {
    const out = await suggestSlots({
      spec: mockScanSpec(),
      candidates: [{ slot: "s1" }, { slot: "s2" }],
      homeLat: 0,
      homeLng: 0,
      busySlots: ["s1"],
    });
    expect(out.slots.map((s) => s.slot)).toEqual(["s2"]);
  });

  it("haversine sanity", () => {
    expect(distanceKm(25.7617, -80.1918, 25.7617, -80.1918)).toBe(0);
    expect(distanceKm(25.7617, -80.1918, 13.6929, -89.2182)).toBeGreaterThan(1000);
  });
});

describe("S3 radarSuggestions", () => {
  it("emits a dated bilingual reminder per entry", async () => {
    const out = await radarSuggestions([
      { entryId: "e1", category: "plumbing", title: "Fix sink", completedAt: "2026-10-29" },
    ]);
    expect(out.reminders).toHaveLength(1);
    expect(out.reminders[0].due_in_days).toBe(360);
    expect(out.mock).toBe(true);
  });
});

describe("S2 briefDay", () => {
  it("briefs an empty day and a full day", async () => {
    const empty = await briefDay({ date: "2026-10-30", jobs: [], proName: "P" });
    expect(empty.text).toContain("no jobs");
    const full = await briefDay({
      date: "2026-10-30",
      jobs: [{ jobId: "j", slot: "2026-10-30T09:00", title: "Fix sink", materials: ["P-trap"] }],
      proName: "P",
    });
    expect(full.text).toContain("P-trap");
    expect(full.mock).toBe(true);
  });
});
