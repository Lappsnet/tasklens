import { describe, expect, it } from "vitest";
import { getBooking, persistBooking } from "../lib/jobs";

describe("bookings (memory fallback when Supabase is unconfigured)", () => {
  it("persists a booking and reads it back with its payment", async () => {
    const { jobId, mock } = await persistBooking({
      scan_id: "scan-test",
      pro_id: "mock-carlos",
      price_usd: 170,
      slot: "2026-10-30T09:00",
      stripe_pi_id: "pi_mock_test",
    });
    expect(mock).toBe(true);
    const got = await getBooking(jobId);
    expect(got?.status).toBe("booked");
    expect(got?.price_usd).toBe(170);
    expect(got?.payment?.stripe_pi_id).toBe("pi_mock_test");
    expect(got?.payment?.status).toBe("requires_capture");
  });

  it("returns null for an unknown job", async () => {
    expect(await getBooking("does-not-exist")).toBeNull();
  });
});
