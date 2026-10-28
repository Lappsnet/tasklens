import { readFileSync } from "node:fs";
import { museClient, modelId, fallbackModelId } from "./client.js";
import { AiSpec, aiSpecJsonSchema, VerifyResult, verifyResultJsonSchema } from "./schemas.js";

const SCAN_PROMPT = readFileSync(new URL("../prompts/scan.md", import.meta.url), "utf8");
const VERIFY_PROMPT = readFileSync(new URL("../prompts/verify.md", import.meta.url), "utf8");

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

  let lastErr: unknown = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const extra = attempt === 1 ? "\n\nPrevious output failed validation. Return ONLY valid JSON matching the schema." : "";
        const res = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SCAN_PROMPT + extra },
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
      { role: "system", content: VERIFY_PROMPT },
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
  form.append("audio", new Blob([buf], { type: "audio/wav" }), "audio.wav");
  const res = await fetch(`${process.env.MODEL_BASE_URL ?? "https://api.meta.ai/v1"}/asr/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`transcribe failed ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { transcript?: string };
  return json.transcript ?? "";
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
