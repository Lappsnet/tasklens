import { describe, expect, it } from "vitest";
import { addBlock, jobToIcs, listBlocks, mintFeedToken, removeBlock, resolveFeedToken, revokeFeedToken } from "../lib/calendar";

describe("S2 calendar blocks", () => {
  it("adds, lists and removes a block", async () => {
    const b = await addBlock({ user_id: "u-cal", starts_at: "2026-10-30T00:00:00", ends_at: "2026-10-30T23:59:00", kind: "busy", note: "off" });
    expect((await listBlocks("u-cal")).some((x) => x.id === b.id)).toBe(true);
    expect(await removeBlock(b.id)).toBe(true);
    expect((await listBlocks("u-cal")).some((x) => x.id === b.id)).toBe(false);
  });

  it("rejects nothing (validation lives at the API boundary)", async () => {
    expect(await removeBlock("nope")).toBe(false);
  });
});

describe("S2 ICS feeds (hash-only tokens)", () => {
  it("mints, resolves and revokes", async () => {
    const { token } = await mintFeedToken("u-feed");
    expect(token.length).toBeGreaterThanOrEqual(64);
    expect(await resolveFeedToken(token)).toBe("u-feed");
    await revokeFeedToken("u-feed");
    expect(await resolveFeedToken(token)).toBeNull();
  });

  it("rejects unknown tokens", async () => {
    expect(await resolveFeedToken("00".repeat(32))).toBeNull();
  });
});

describe("S2 ICS generation", () => {
  it("emits a valid VEVENT", () => {
    const ics = jobToIcs({ id: "j1", title: "Fix sink", slot: "2026-10-30T09:00:00Z", durationH: 2 });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261030T090000Z");
    expect(ics).toContain("UID:j1@tasklens");
  });
});
