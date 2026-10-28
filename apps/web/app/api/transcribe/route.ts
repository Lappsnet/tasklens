import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribeBuffer } from "@tasklens/ai";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const AUDIO_MIME = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
]);
const MAX_FILE = 10 * 1024 * 1024;

const Fields = z.object({ lang: z.enum(["en", "es"]).default("en") });

function demoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return !process.env.MODEL_API_KEY;
}

export async function POST(req: Request) {
  if (!rateLimit(`transcribe:${clientKey(req)}`, 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Fields.safeParse({ lang: String(form.get("lang") ?? "en") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { lang } = parsed.data;

  const raw = form.get("audio");
  const audio = raw instanceof File ? raw : null;
  if (!audio || audio.size === 0) return NextResponse.json({ error: "need_audio" }, { status: 400 });
  if (!AUDIO_MIME.has(audio.type) || audio.size > MAX_FILE) {
    return NextResponse.json({ error: "bad_audio" }, { status: 413 });
  }

  try {
    if (demoMode()) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({
        transcript:
          lang === "es"
            ? "Hay una fuga bajo el fregadero de la cocina desde ayer."
            : "Water leaking under the kitchen sink since yesterday.",
        mock: true,
      });
    }
    const buf = new Uint8Array(await audio.arrayBuffer());
    const transcript = await transcribeBuffer({
      buffer: buf,
      mimeType: audio.type,
      filename: audio.name || "note",
      lang,
    });
    return NextResponse.json({ transcript, mock: false });
  } catch (e) {
    console.error("[api/transcribe] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "transcribe_failed" }, { status: 500 });
  }
}
