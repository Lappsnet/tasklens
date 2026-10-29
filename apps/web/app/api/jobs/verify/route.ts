import { NextResponse } from "next/server";
import { z } from "zod";
import {
  mockVerifyResult,
  segmentDamage,
  verifyCompletion,
  type AiSpec,
  type VerifyResult,
} from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getMemoryScan, getScanSpec } from "@/lib/scans";
import {
  appendEvent,
  getBooking,
  getEvents,
  saveVerifyResult,
  transitionJob,
  updatePaymentStatus,
} from "@/lib/jobs";
import { IMAGE_MIME, MAX_FILE, withTimeout } from "@/lib/scan-pipeline";
import { capturePayment } from "@/lib/stripe";
import { demoMode } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const Fields = z.object({ jobId: z.string().min(1).max(100) });

async function fileToDataUrl(f: File): Promise<string> {
  const buf = Buffer.from(await f.arrayBuffer());
  return `data:${f.type};base64,${buf.toString("base64")}`;
}

/**
 * Day 5: run AI verification on after photos. On a pass verdict the job
 * completes AND escrow is captured. Anything else is rejected or stays pending.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`verify:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  // Pro (or admin) submits verification. Capture happens server-side on pass.
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Fields.safeParse({ jobId: String(form.get("jobId") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const after = form
    .getAll("after")
    .filter((v): v is File => v instanceof File && v.size > 0);
  if (after.length === 0 || after.length > 3) return NextResponse.json({ error: "need_photo" }, { status: 400 });
  for (const p of after) {
    if (!IMAGE_MIME.has(p.type) || p.size > MAX_FILE) {
      return NextResponse.json({ error: "bad_photo" }, { status: 413 });
    }
  }

  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["in_progress", "pending_verify"].includes(booking.status)) {
    return NextResponse.json({ error: "not_ready", status: booking.status }, { status: 409 });
  }
  const spec = await getScanSpec(booking.scan_id);
  if (!spec) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });

  try {
    const mock = demoMode();
    const afterUrls = await Promise.all(after.map((p) => fileToDataUrl(p)));
    // "Before" is the scan photo kept server-side (memory fallback). Real
    // verification requires it; the mock path grades on after photos alone.
    const beforeUrl = getMemoryScan(booking.scan_id)?.photoDataUrl;
    if (!mock && !beforeUrl) return NextResponse.json({ error: "need_before" }, { status: 409 });

    let verdict: VerifyResult;
    let sam: unknown = null;
    if (mock) {
      await new Promise((r) => setTimeout(r, 800));
      verdict = mockVerifyResult(spec as AiSpec);
    } else {
      verdict = await withTimeout(
        verifyCompletion({ before: [beforeUrl as string], after: afterUrls, spec: spec as AiSpec }),
      );
      // SAM highlight, best-effort: never blocks verification on failure.
      try {
        sam = await withTimeout(
          (async () => segmentDamage(afterUrls[0], (spec as AiSpec).title))() as Promise<unknown>,
          15_000,
        );
      } catch {
        sam = null;
      }
    }

    await saveVerifyResult(parsed.data.jobId, verdict);
    await appendEvent(parsed.data.jobId, "verified", { verdict: verdict.verdict, summary: verdict.summary });
    if ((spec as AiSpec).damage_box) {
      await appendEvent(parsed.data.jobId, "highlight", { damage_box: (spec as AiSpec).damage_box, sam });
    }

    if (verdict.verdict !== "pass") {
      // Stays pending_verify so the pro can fix and resubmit.
      const events = await getEvents(parsed.data.jobId);
      return NextResponse.json({ verdict, job: await getBooking(parsed.data.jobId), events, mock });
    }

    // PASS: record pending_verify first (pro submitted from in_progress), then
    // complete the job and capture escrow. Only this path captures payment.
    if (booking.status === "in_progress") {
      await transitionJob(parsed.data.jobId, "pending_verify");
    }
    const completed = await transitionJob(parsed.data.jobId, "completed");
    if (!completed) return NextResponse.json({ error: "complete_failed" }, { status: 500 });
    const payment = booking.payment;
    let capture = { status: "succeeded", mock };
    if (payment) {
      capture = await capturePayment(payment.stripe_pi_id);
      await updatePaymentStatus(payment.stripe_pi_id, capture.status);
      await appendEvent(parsed.data.jobId, "payment_released", { amount_usd: booking.price_usd });
    }
    return NextResponse.json({
      verdict,
      job: await getBooking(parsed.data.jobId),
      events: await getEvents(parsed.data.jobId),
      payment: payment ? { piId: payment.stripe_pi_id, status: capture.status } : null,
      mock,
    });
  } catch (e) {
    console.error("[api/jobs/verify] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "verify_failed" }, { status: 500 });
  }
}
