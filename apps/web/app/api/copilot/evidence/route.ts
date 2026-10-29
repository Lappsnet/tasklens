import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";
import { IMAGE_MIME } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Evidence frames are small on purpose: they live in the job log, not Storage. */
const EVIDENCE_MAX = 2 * 1024 * 1024;

const Fields = z.object({
  jobId: z.string().min(1).max(100),
  step: z.string().min(1).max(500),
});

/**
 * S8 step evidence: the pro says "listo" and the current frame is saved as
 * evidence for that step. Marks the step done and logs the frame, so
 * verification can cite it. Photo stays in the job log (≤2 MB).
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`evidence:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Fields.safeParse({ jobId: String(form.get("jobId") ?? ""), step: String(form.get("step") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const raw = form.get("photo");
  const photo = raw instanceof File ? raw : null;
  if (!photo || photo.size === 0) return NextResponse.json({ error: "need_photo" }, { status: 400 });
  if (!IMAGE_MIME.has(photo.type) || photo.size > EVIDENCE_MAX) {
    return NextResponse.json({ error: "bad_photo" }, { status: 413 });
  }
  if (!(await getBooking(parsed.data.jobId))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const buf = Buffer.from(await photo.arrayBuffer());
    const ev = await appendEvent(parsed.data.jobId, "step_evidence", {
      step: parsed.data.step,
      mime: photo.type,
      size: photo.size,
      photoDataUrl: `data:${photo.type};base64,${buf.toString("base64")}`,
      said_listo: true,
    });
    await appendEvent(parsed.data.jobId, "step", { step: parsed.data.step, done: true, via: "listo" });
    return NextResponse.json({ event: ev });
  } catch (e) {
    console.error("[api/copilot/evidence] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "evidence_failed" }, { status: 500 });
  }
}
