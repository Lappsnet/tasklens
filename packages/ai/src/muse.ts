import { readFileSync } from "node:fs";
import { join } from "node:path";
import { museClient, modelId, fallbackModelId } from "./client.js";
import { AiSpec, aiSpecJsonSchema, VerifyResult, verifyResultJsonSchema } from "./schemas.js";

/**
 * Prompts are loaded lazily (not at module top-level) so bundlers
 * (Next.js build-time page collection) can import this module safely.
 * Resolution order: sibling prompts/ dir (real Node: CLI + server runtime),
 * then monorepo-relative fallbacks, then throw with a clear message.
 */
const promptCache = new Map<string, string>();
function loadPrompt(name: "scan.md" | "verify.md" | "match.md"): string {
  const hit = promptCache.get(name);
  if (hit) return hit;
  const candidates: string[] = [];
  try {
    candidates.push(new URL(`../prompts/${name}`, import.meta.url).toString());
  } catch {
    /* bundler sandbox without import.meta.url */
  }
  candidates.push(
    join(process.cwd(), "packages", "ai", "prompts", name),
    join(process.cwd(), "..", "..", "packages", "ai", "prompts", name),
    join(process.cwd(), "..", "ai", "prompts", name),
  );
  let lastErr: unknown = null;
  for (const c of candidates) {
    try {
      const text = c.startsWith("file:")
        ? readFileSync(new URL(c), "utf8")
        : readFileSync(c, "utf8");
      promptCache.set(name, text);
      return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`AI prompt ${name} not found (tried ${candidates.length} locations): ${String(lastErr)}`);
}

export interface ScanInput {
  images: string[]; // data URLs (data:image/...;base64,...) or https URLs
  transcript: string;
  lang?: "en" | "es";
}

function toImageContent(image: string) {
  return { type: "image_url" as const, image_url: { url: image } };
}

export async function scanToSpec(input: ScanInput): Promise<AiSpec> {
  const client = museClient();
  const models = [modelId(), fallbackModelId()];
  const userText = `Customer transcript (${input.lang ?? "en"}):\n${input.transcript || "(no transcript)"}\n\nReturn the AiSpec JSON now.`;
  const scanPrompt = loadPrompt("scan.md");

  let lastErr: unknown = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const extra = attempt === 1 ? "\n\nPrevious output failed validation. Return ONLY valid JSON matching the schema." : "";
        const res = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: scanPrompt + extra },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                ...input.images.map((img) => toImageContent(img)),
              ] as never,
            },
          ],
          response_format: { type: "json_schema", json_schema: aiSpecJsonSchema() as never },
          max_tokens: 1500,
        });
        const raw = res.choices[0]?.message?.content ?? "";
        const parsed = AiSpec.safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error("AiSpec validation failed: " + parsed.error.message);
        // normalize price tuple
        const [lo, hi] = parsed.data.price_range_usd;
        if (lo > hi) parsed.data.price_range_usd = [hi, lo];
        return parsed.data;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw new Error(`scanToSpec failed on ${models.join(",")}: ${String(lastErr)}`);
}

export async function verifyCompletion(args: {
  before: string[];
  after: string[];
  spec: AiSpec;
}): Promise<VerifyResult> {
  const client = museClient();
  const res = await client.chat.completions.create({
    model: modelId(),
    messages: [
      { role: "system", content: loadPrompt("verify.md") },
      {
        role: "user",
        content: [
          { type: "text", text: `Job spec:\n${JSON.stringify(args.spec)}\n\nBEFORE photos first, then AFTER photos. Verdict now.` },
          ...args.before.map((img) => ({ type: "text" as const, text: `[BEFORE] ${img.slice(0, 80)}...` })),
          ...args.before.map((img) => toImageContent(img)),
          ...args.after.map((img) => toImageContent(img)),
        ] as never,
      },
    ],
    response_format: { type: "json_schema", json_schema: verifyResultJsonSchema() as never },
    max_tokens: 1200,
  });
  const raw = res.choices[0]?.message?.content ?? "";
  const parsed = VerifyResult.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("VerifyResult validation failed: " + parsed.error.message);
  return parsed.data;
}

export async function transcribe(args: { filePath: string; lang?: string }): Promise<string> {
  // File transcription per docs: POST /v1/asr/transcribe multipart (request + audio WAV).
  // Implemented in Day 2 route handler; helper here shells the same endpoint.
  const { readFileSync } = await import("node:fs");
  const buf = readFileSync(args.filePath);
  return transcribeBuffer({ buffer: buf, mimeType: "audio/wav", filename: "audio.wav", lang: args.lang });
}

export async function transcribeBuffer(args: {
  buffer: Uint8Array;
  mimeType?: string;
  filename?: string;
  lang?: string;
}): Promise<string> {
  const form = new FormData();
  form.append(
    "request",
    JSON.stringify({
      mode: "PUSH_TO_TALK",
      model: process.env.ASR_MODEL ?? "muse-voice-transcribe-1.0",
      audioEncoding: "WAV",
      languageBias: args.lang === "es" ? ["Spanish", "English"] : ["English", "Spanish"],
    }),
  );
  form.append(
    "audio",
    new Blob([args.buffer as unknown as BlobPart], { type: args.mimeType ?? "audio/wav" }),
    args.filename ?? "audio.wav",
  );
  const res = await fetch(`${process.env.MODEL_BASE_URL ?? "https://api.meta.ai/v1"}/asr/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`transcribe failed ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { transcript?: string };
  return json.transcript ?? "";
}

/** Deterministic Day 2 mock spec (no API key needed). Shared by CLI --mock and web DEMO_MODE. */
export function mockScanSpec(): AiSpec {
  return {
    category: "plumbing",
    title: "Leaking P-trap under kitchen sink",
    diagnosis: "Mock: P-trap washer failed; slow drip corroding cabinet floor.",
    urgency: "medium",
    skill_level: "handyman",
    est_hours: 1.5,
    materials: ["P-trap kit 1.5in", "plumber's tape", "bucket"],
    price_range_usd: [120, 220],
    steps: ["Shut off water", "Replace P-trap", "Leak test", "Clean cabinet"],
    safety_flags: [],
    questions_for_customer: ["Is the leak active now? / ¿La fuga está activa ahora?"],
    damage_box: { x: 0.3, y: 0.5, w: 0.4, h: 0.3 },
    confidence: 0.82,
  };
}

export async function previewAfter(args: { photoDataUrl: string; spec: AiSpec }): Promise<string> {
  // Muse Image one-off edit: POST /v1/images/edits (JSON shape with images[]).
  const res = await fetch(`${process.env.MODEL_BASE_URL ?? "https://api.meta.ai/v1"}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL ?? "muse-image-1.0",
      prompt: `Show this room/area repaired: ${args.spec.diagnosis}. Fixed, clean, realistic after-photo.`,
      images: [{ image_url: args.photoDataUrl }],
      n: 1,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) throw new Error(`previewAfter failed ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("previewAfter: no image returned");
  return `data:image/webp;base64,${b64}`;
}

export async function segmentDamage(photoUrl: string, nounPhrase: string): Promise<unknown> {
  // SAM 3.1 via Model API Responses API (docs: model sam-3.1, POST /v1/responses, streamed).
  // Never block the flow: callers fall back to ai_spec.damage_box on any error.
  const res = await fetch(`${process.env.MODEL_BASE_URL ?? "https://api.meta.ai/v1"}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: process.env.SAM_MODEL ?? "sam-3.1",
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: nounPhrase },
            { type: "input_image", image_url: photoUrl },
          ],
        },
      ],
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`sam failed ${res.status}`);
  return res.text();
}
