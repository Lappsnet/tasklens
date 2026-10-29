import { describe, expect, it } from "vitest";
import { appendEvent, getEvents, listJobs, persistBooking, transitionJob } from "../lib/jobs";

describe("Day 4 job state machine", () => {
  it("walks booked → en_route → in_progress → pending_verify, logging each step", async () => {
    const { jobId } = await persistBooking({
      scan_id: "s",
      pro_id: "p",
      price_usd: 100,
      slot: "t",
      stripe_pi_id: "pi",
    });
    for (const to of ["en_route", "in_progress", "pending_verify"]) {
      const job = await transitionJob(jobId, to);
      expect(job?.status).toBe(to);
    }
    const kinds = (await getEvents(jobId)).map((e) => e.kind);
    expect(kinds).toEqual(["booked", "en_route", "in_progress", "pending_verify"]);
  });

  it("rejects illegal jumps (booked → in_progress, unknown → anything)", async () => {
    const { jobId } = await persistBooking({
      scan_id: "s",
      pro_id: "p",
      price_usd: 100,
      slot: "t",
      stripe_pi_id: "pi2",
    });
    expect(await transitionJob(jobId, "in_progress")).toBeNull();
    expect(await transitionJob(jobId, "completed")).toBeNull();
    expect(await transitionJob("nope", "en_route")).toBeNull();
  });

  it("lists jobs, optionally filtered by status", async () => {
    const { jobId } = await persistBooking({
      scan_id: "s",
      pro_id: "p",
      price_usd: 50,
      slot: "t",
      stripe_pi_id: "pi3",
    });
    const all = await listJobs();
    expect(all.some((j) => j.id === jobId)).toBe(true);
    const booked = await listJobs("booked");
    expect(booked.every((j) => j.status === "booked")).toBe(true);
  });

  it("appends notes and steps to the log", async () => {
    const { jobId } = await persistBooking({
      scan_id: "s",
      pro_id: "p",
      price_usd: 50,
      slot: "t",
      stripe_pi_id: "pi4",
    });
    await appendEvent(jobId, "note", { text: "hello" });
    await appendEvent(jobId, "step", { step: "x", done: true });
    const kinds = (await getEvents(jobId)).map((e) => e.kind);
    expect(kinds).toContain("note");
    expect(kinds).toContain("step");
  });
});
