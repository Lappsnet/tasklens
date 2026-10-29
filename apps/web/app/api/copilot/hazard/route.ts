import { NextResponse } from "next/server";
import { z } from "zod";
import { watchHazards } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";
import { getScanSpec } from "@/lib/scans";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  jobId: z.string().min(1).max(100),
  /** Short description of the current frame (glasses/phone). Empty = spec flags only. */
  frameNote: z.string().max(500).default(""),
  lang: z.enum(["en", "es"]).optional(),
});

/**
 * S8 hazard watch: check one frame for visible hazards. Advisory only — never
 * blocks the job. A positive check is logged and returned for spoken warning.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`hazard:${clientKey(req)}`, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["booked", "en_route", "in_progress", "pending_verify"].includes(booking.status)) {
    return NextResponse.json({ error: "not_ready", status: booking.status }, { status: 409 });
  }
  const spec = await getScanSpec(booking.scan_id);
  if (!spec) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });

  try {
    const { watch, mock } = await watchHazards({ spec, frameNote: parsed.data.frameNote, lang: parsed.data.lang });
    let event = null;
    if (!watch.safe) {
      event = await appendEvent(parsed.data.jobId, "hazard", {
        hazards: watch.hazards,
        warning: watch.warning,
        frameNote: parsed.data.frameNote.slice(0, 200),
        advisory: true,
        mock,
      });
    }
    return NextResponse.json({ ...watch, event, mock, advisory: true });
  } catch (e) {
    console.error("[api/copilot/hazard] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "hazard_failed" }, { status: 500 });
  }
}
