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
  recordPayout,
  saveVerifyResult,
  transitionJob,
  updatePaymentStatus,
} from "@/lib/jobs";
import { IMAGE_MIME, MAX_FILE, withTimeout } from "@/lib/scan-pipeline";
import { getProvider, idempotencyKey } from "@/lib/payments";
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
    let capture = { status: "succeeded", capturedUsd: booking.price_usd, mock };
    if (payment && booking.price_usd > 0) {
      const provider = getProvider();
      const authId = payment.authorizationId ?? payment.stripe_pi_id;
      capture = {
        ...(await provider.capture({ authorizationId: authId, amountUsd: booking.price_usd, idempotencyKey: idempotencyKey(booking.id, "capture") })),
        mock: provider.name === "mock",
      };
      await updatePaymentStatus(authId, capture.status);
      await recordPayout({ jobId: booking.id, proId: booking.pro_id, amountUsd: capture.capturedUsd });
      await appendEvent(parsed.data.jobId, "payment_released", { amount_usd: capture.capturedUsd, provider: provider.name });
    } else if (payment) {
      await updatePaymentStatus(payment.authorizationId ?? payment.stripe_pi_id, "succeeded");
    }
    // S3: every verified job writes a Home Passport entry + maintenance reminder.
    try {
      const [{ getOrCreateHome, addEntry, addReminder }, { radarSuggestions }, { getContractByJob }] = await Promise.all([
        import("@/lib/passport"),
        import("@tasklens/ai"),
        import("@/lib/contracts"),
      ]);
      const home = await getOrCreateHome(booking.customer_id);
      const contract = await getContractByJob(booking.id).catch(() => null);
      const warrantyDays = contract?.warranty_days ?? 30;
      const entry = await addEntry({
        home_id: home.id,
        job_id: booking.id,
        category: (spec as AiSpec).category,
        title: (spec as AiSpec).title,
        before_photo: beforeUrl,
        after_photo: afterUrls[0],
        contract_id: contract?.id,
        materials: (spec as AiSpec).materials,
        pro_id: booking.pro_id,
        warranty_until: new Date(Date.now() + warrantyDays * 86400_000).toISOString().slice(0, 10),
        ai_summary: verdict.summary,
      });
      const radar = await radarSuggestions([{ entryId: entry.id, category: entry.category, title: entry.title, completedAt: new Date().toISOString() }]);
      for (const r of radar.reminders.slice(0, 2)) {
        await addReminder({
          home_id: home.id,
          entry_id: entry.id,
          title: r.title,
          due_on: new Date(Date.now() + r.due_in_days * 86400_000).toISOString().slice(0, 10),
          done: false,
        });
      }
    } catch (e) {
      console.error("[verify] passport entry failed (non-blocking):", e instanceof Error ? e.message : e);
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
