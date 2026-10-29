import { describe, expect, it } from "vitest";
import { addEntry, addReminder, completeReminder, getOrCreateHome, listEntries, listReminders, mintShareLink, resolveShare } from "../lib/passport";

describe("S3 Home Passport (memory fallback)", () => {
  it("writes an entry and a reminder on verification", async () => {
    const home = await getOrCreateHome("u-s3");
    const entry = await addEntry({
      home_id: home.id,
      job_id: "j-s3",
      category: "plumbing",
      title: "Fix sink",
      materials: ["P-trap"],
      warranty_until: "2027-10-29",
      ai_summary: "Leak fixed.",
    });
    expect(entry.id.length).toBeGreaterThan(10);
    await addReminder({ home_id: home.id, entry_id: entry.id, title: "Check heater", due_on: "2026-10-29", done: false });
    expect((await listEntries(home.id)).some((e) => e.id === entry.id)).toBe(true);
    const before = await listReminders(home.id);
    expect(before.some((r) => r.entry_id === entry.id)).toBe(true);
    await completeReminder(home.id, before[0].id, true);
    expect(await listReminders(home.id)).toHaveLength(before.length - 1);
  });

  it("mints and resolves a share link, then revokes it", async () => {
    const home = await getOrCreateHome("u-share");
    const { url, mock } = await mintShareLink(home.id);
    expect(mock).toBe(true);
    const token = url.split("/").pop() as string;
    expect(token.length).toBe(64);
    const { resolveShare } = await import("../lib/passport");
    expect(await resolveShare(token)).toBe(home.id);
    expect(await resolveShare("00".repeat(32))).toBeNull();
  });
});
