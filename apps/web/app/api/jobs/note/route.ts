import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribeBuffer } from "@tasklens/ai";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { appendEvent, getBooking } from "@/lib/jobs";
import { AUDIO_MIME, MAX_FILE, withTimeout } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const Fields = z.object({ jobId: z.string().min(1).max(100) });

function demoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return !process.env.MODEL_API_KEY;
}

/** Pro hands-free voice note: transcribe → append to the job log. */
export async function POST(req: Request) {
  if (!rateLimit(`note:${clientKey(req)}`, 30)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Fields.safeParse({ jobId: String(form.get("jobId") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const raw = form.get("audio");
  const audio = raw instanceof File ? raw : null;
  if (!audio || audio.size === 0) return NextResponse.json({ error: "need_audio" }, { status: 400 });
  if (!AUDIO_MIME.has(audio.type) || audio.size > MAX_FILE) {
    return NextResponse.json({ error: "bad_audio" }, { status: 413 });
  }
  if (!(await getBooking(parsed.data.jobId))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    let text: string;
    if (demoMode()) {
      await new Promise((r) => setTimeout(r, 300));
      text = "Shut-off valve closed, starting P-trap replacement. (demo note)";
    } else {
      const buf = new Uint8Array(await audio.arrayBuffer());
      text = await withTimeout(transcribeBuffer({ buffer: buf, mimeType: audio.type, filename: audio.name || "note", lang: "en" }));
    }
    const ev = await appendEvent(parsed.data.jobId, "note", { text });
    return NextResponse.json({ event: ev, mock: demoMode() });
  } catch (e) {
    console.error("[api/jobs/note] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "note_failed" }, { status: 500 });
  }
}
