import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribeBuffer } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { getSession } from "@/lib/auth";
import { demoMode } from "@/lib/env";

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

export async function POST(req: Request) {
  if (!(await hitRateLimit(`transcribe:${clientKey(req)}`, 20))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const session = await getSession(req);
  if (session && !["customer", "pro", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
    try {
      const { withTimeout } = await import("@/lib/scan-pipeline");
      const transcript = await withTimeout(
        transcribeBuffer({
          buffer: buf,
          mimeType: audio.type,
          filename: audio.name || "note",
          lang,
        }),
        25_000,
      );
      return NextResponse.json({ transcript, mock: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[api/transcribe] failed:", msg);
      if (msg.includes("timed out")) {
        return NextResponse.json({ error: "transcribe_unavailable" }, { status: 503 });
      }
      return NextResponse.json({ error: "transcribe_failed" }, { status: 500 });
    }
  } catch (e) {
    console.error("[api/transcribe] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "transcribe_failed" }, { status: 500 });
  }
}
