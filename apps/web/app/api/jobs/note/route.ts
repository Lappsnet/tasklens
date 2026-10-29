import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribeBuffer } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { demoMode } from "@/lib/env";
import { appendEvent, getBooking } from "@/lib/jobs";
import { AUDIO_MIME, MAX_FILE, withTimeout } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const Fields = z.object({ jobId: z.string().min(1).max(100) });

/** Pro hands-free voice note: transcribe → append to the job log. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`note:${clientKey(req)}`, 30))) {
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
