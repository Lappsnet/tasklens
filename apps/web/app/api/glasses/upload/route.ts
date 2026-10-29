import { NextResponse } from "next/server";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { TextFields, processScan, validateUpload } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Day 3: glasses companion upload. Same pipeline as /api/scan (phone) but the
 * photo key is `photo` (single frame from the glasses) and the caller is
 * identified via x-device header. Returns scanId + spec so the companion app
 * can speak the quote back with on-phone TTS.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`glasses:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  // Companion app authenticates like the web client (demo cookie or magic-link JWT).
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = TextFields.safeParse({
    transcript: String(form.get("transcript") ?? ""),
    lang: String(form.get("lang") ?? "en"),
  });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const rawPhoto = form.get("photo");
  if (rawPhoto instanceof File && rawPhoto.size > 0) {
    // Normalize to the pipeline's `photos` key (single glasses frame).
    form.delete("photo");
    form.append("photos", rawPhoto, rawPhoto.name || "glasses.jpg");
  }
  const files = validateUpload(form, "photos");
  if ("error" in files) {
    return NextResponse.json({ error: files.error }, { status: files.error === "need_photo" ? 400 : 413 });
  }

  try {
    const out = await processScan({
      photos: files.photos.slice(0, 1),
      transcript: parsed.data.transcript,
      lang: parsed.data.lang,
      audio: files.audio,
      source: "glasses",
      userId: gate.session.userId,
    });
    return NextResponse.json({
      ...out,
      device: req.headers.get("x-device") ?? "glasses",
      next: `/book/${out.scanId}`,
    });
  } catch (e) {
    console.error("[api/glasses/upload] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }
}
