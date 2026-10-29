import { NextResponse } from "next/server";
import { z } from "zod";
import { previewAfter, type AiSpec } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { demoMode } from "@/lib/env";
import { getScanSpec } from "@/lib/scans";
import { getBooking } from "@/lib/jobs";
import { IMAGE_MIME, MAX_FILE, withTimeout } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const Fields = z.object({ jobId: z.string().min(1).max(100) });

/** Day 5: Muse Image "after" preview generated from a job photo. Mock → null. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`preview:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "admin", "customer"]);
  if ("response" in gate) return gate.response;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Fields.safeParse({ jobId: String(form.get("jobId") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const raw = form.get("photo");
  const photo = raw instanceof File ? raw : null;
  if (!photo || photo.size === 0) return NextResponse.json({ error: "need_photo" }, { status: 400 });
  if (!IMAGE_MIME.has(photo.type) || photo.size > MAX_FILE) {
    return NextResponse.json({ error: "bad_photo" }, { status: 413 });
  }
  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const spec = await getScanSpec(booking.scan_id);
  if (!spec) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });

  try {
    if (demoMode()) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ preview: null, mock: true, note: "preview needs MODEL_API_KEY" });
    }
    const buf = Buffer.from(await photo.arrayBuffer());
    const dataUrl = `data:${photo.type};base64,${buf.toString("base64")}`;
    const preview = await withTimeout(previewAfter({ photoDataUrl: dataUrl, spec: spec as AiSpec }));
    return NextResponse.json({ preview, mock: false });
  } catch (e) {
    console.error("[api/jobs/preview] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "preview_failed" }, { status: 500 });
  }
}
