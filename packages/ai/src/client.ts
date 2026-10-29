import OpenAI from "openai";

let cached: OpenAI | null = null;

export function museClient(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not set (server-only env)");
  cached = new OpenAI({
    baseURL: process.env.MODEL_BASE_URL ?? "https://api.meta.ai/v1",
    apiKey,
  });
  return cached;
}

export function modelId(): string {
  return process.env.MODEL_ID ?? "muse-spark-1.3";
}

export function fallbackModelId(): string {
  return process.env.MODEL_FALLBACK_ID ?? "muse-spark-1.2";
}

/** Production never takes mock paths (memory stores are for tests/local demo only). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
