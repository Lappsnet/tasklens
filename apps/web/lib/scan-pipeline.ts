import { z } from "zod";
import { mockScanSpec, scanToSpec, transcribeBuffer, type AiSpec } from "@tasklens/ai";
import { saveMemoryScan } from "./scans";
import { hasSupabase, serviceClient } from "./supabase-server";
import { hasStorage, uploadPhoto } from "./storage";
import { demoMode } from "./env";

export const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const AUDIO_MIME = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
]);
export const MAX_FILE = 10 * 1024 * 1024;
export const MAX_PHOTOS = 3;

export const TextFields = z.object({
  transcript: z.string().max(2000).default(""),
  lang: z.enum(["en", "es"]).default("en"),
});

async function fileToDataUrl(f: File): Promise<string> {
  const buf = Buffer.from(await f.arrayBuffer());
  return `data:${f.type};base64,${buf.toString("base64")}`;
}

export function withTimeout<T>(p: Promise<T>, ms = 30_000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}

export interface ScanPipelineInput {
  photos: File[];
  transcript: string;
  lang: "en" | "es";
  audio: File | null;
  source: "web" | "glasses";
  userId?: string;
}

export interface ScanPipelineOutput {
  scanId: string;
  spec: AiSpec;
  transcript: string;
  lang: string;
  mock: boolean;
}

/** Shared scan pipeline: used by /api/scan (phone) and /api/glasses/upload. */
export async function processScan(input: ScanPipelineInput): Promise<ScanPipelineOutput> {
  const mock = demoMode();
  let transcriptUsed = input.transcript.trim();

  if (mock) {
    await new Promise((r) => setTimeout(r, 600));
    if (!transcriptUsed && input.audio) {
      transcriptUsed = input.lang === "es" ? "(nota de voz de demostración)" : "(demo voice note)";
    }
    const spec = mockScanSpec();
    const first = input.photos[0];
    const photoDataUrl = first ? await fileToDataUrl(first) : undefined;
    return persist({ spec, transcript: transcriptUsed, lang: input.lang, photoCount: input.photos.length, photoDataUrl, userId: input.userId, mock });
  }

  if (!transcriptUsed && input.audio) {
    const buf = new Uint8Array(await input.audio.arrayBuffer());
    transcriptUsed = (
      await withTimeout(
        transcribeBuffer({ buffer: buf, mimeType: input.audio.type, filename: input.audio.name || "note", lang: input.lang }),
      )
    ).slice(0, 2000);
  }

  const images = await Promise.all(input.photos.map((p) => fileToDataUrl(p)));
  const spec = await withTimeout(scanToSpec({ images, transcript: transcriptUsed, lang: input.lang }));
  return persist({ spec, transcript: transcriptUsed, lang: input.lang, photoCount: input.photos.length, photoDataUrl: images[0], userId: input.userId, mock: false });
}

async function persist(args: {
  spec: AiSpec;
  transcript: string;
  lang: string;
  photoCount: number;
  photoDataUrl?: string;
  userId?: string;
  mock: boolean;
}): Promise<ScanPipelineOutput> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        // Private bucket upload (service role). Photo URLs stay server-side;
        // clients receive short-lived signed URLs from /api/media/sign.
        let photo_urls: string[] = [];
        if (args.photoDataUrl && hasStorage()) {
          const m = args.photoDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
          if (m) {
            const path = await uploadPhoto(Buffer.from(m[2], "base64"), m[1], "scans");
            if (path) photo_urls = [path];
          }
        }
        // Documented service-role use: server sets customer_id after validating
        // the session; service role bypasses RLS (Day 6 lockdown, 003 migration).
        const { data, error } = await db
          .from("scans")
          .insert({ customer_id: args.userId ?? null, photo_urls, transcript: args.transcript, lang: args.lang, ai_spec: args.spec })
          .select("id")
          .single();
        if (!error && data) {
          return { scanId: data.id as string, spec: args.spec, transcript: args.transcript, lang: args.lang, mock: args.mock };
        }
        console.error("[scan-pipeline] supabase insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[scan-pipeline] supabase error:", e instanceof Error ? e.message : e);
    }
  }
  const row = saveMemoryScan({ spec: args.spec, transcript: args.transcript, lang: args.lang, photoCount: args.photoCount, photoDataUrl: args.photoDataUrl });
  return { scanId: row.scanId, spec: args.spec, transcript: args.transcript, lang: args.lang, mock: args.mock };
}

/** Validate photo/audio files from a multipart form. Returns error code or files. */
export function validateUpload(
  form: FormData,
  photoKey: string,
): { photos: File[]; audio: File | null } | { error: "need_photo" | "bad_photo" | "bad_audio" } {
  const photos = form
    .getAll(photoKey)
    .filter((v): v is File => v instanceof File && v.size > 0);
  if (photos.length === 0 || photos.length > MAX_PHOTOS) return { error: "need_photo" };
  for (const p of photos) {
    if (!IMAGE_MIME.has(p.type) || p.size > MAX_FILE) return { error: "bad_photo" };
  }
  const audioRaw = form.get("audio");
  const audio = audioRaw instanceof File && audioRaw.size > 0 ? audioRaw : null;
  if (audio && (!AUDIO_MIME.has(audio.type) || audio.size > MAX_FILE)) return { error: "bad_audio" };
  return { photos, audio };
}
