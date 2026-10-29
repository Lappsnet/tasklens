import { NextResponse } from "next/server";
import { z } from "zod";
import { answerCopilot } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";
import { getScanSpec } from "@/lib/scans";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  jobId: z.string().min(1).max(100),
  question: z.string().min(1).max(500),
  frameNote: z.string().max(500).optional(),
  lang: z.enum(["en", "es"]).optional(),
});

/**
 * S8 Pro Copilot Q&A: the pro asks aloud, Muse answers from the job spec,
 * the phone/glasses speak the answer. The exchange is logged for verification.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`copilot:${clientKey(req)}`, 30))) {
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
    const { answer, mock } = await answerCopilot({
      question: parsed.data.question,
      spec,
      frameNote: parsed.data.frameNote,
      lang: parsed.data.lang,
    });
    const event = await appendEvent(parsed.data.jobId, "copilot_qa", {
      question: parsed.data.question.slice(0, 200),
      answer: answer.answer,
      safety_note: answer.safety_note,
      relates_to_step: answer.relates_to_step,
      mock,
    });
    return NextResponse.json({ answer, event, mock });
  } catch (e) {
    console.error("[api/copilot/ask] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "copilot_failed" }, { status: 500 });
  }
}
