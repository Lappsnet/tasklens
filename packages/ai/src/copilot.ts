import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { museClient, modelId } from "./client.js";
import type { AiSpec } from "./schemas.js";

export const CopilotAnswer = z.object({
  answer: z.string().min(1).max(1000),
  safety_note: z.string().max(500).nullable(),
  relates_to_step: z.string().max(500).nullable(),
});
export type CopilotAnswer = z.infer<typeof CopilotAnswer>;

export const HazardWatch = z.object({
  safe: z.boolean(),
  hazards: z.array(z.string().max(200)).max(10),
  warning: z.string().max(500).nullable(),
});
export type HazardWatch = z.infer<typeof HazardWatch>;

const promptCache = new Map<string, string>();
function loadCopilotPrompt(): string {
  const hit = promptCache.get("copilot.md");
  if (hit) return hit;
  const candidates = [
    join(process.cwd(), "packages", "ai", "prompts", "copilot.md"),
    join(process.cwd(), "..", "..", "packages", "ai", "prompts", "copilot.md"),
    join(process.cwd(), "..", "ai", "prompts", "copilot.md"),
  ];
  try {
    const url = new URL("../prompts/copilot.md", import.meta.url).toString();
    candidates.unshift(url);
  } catch {
    /* bundler sandbox */
  }
  for (const c of candidates) {
    try {
      const text = c.startsWith("file:") ? readFileSync(new URL(c), "utf8") : readFileSync(c, "utf8");
      promptCache.set("copilot.md", text);
      return text;
    } catch {
      /* next */
    }
  }
  return "You are a hands-free repair assistant. Answer briefly in the question's language. Output ONLY JSON.";
}

function guessLang(text: string): "en" | "es" {
  if (/[áéíóúñ¿¡]/i.test(text)) return "es";
  const words = text.toLowerCase().split(/[^a-zñ]+/);
  const esHits = words.filter((w) =>
    ["hay", "el", "la", "los", "las", "una", "uno", "este", "esta", "junto", "cerca", "tubo", "fregadero", "cable", "que", "como", "donde", "peligro"].includes(w),
  ).length;
  return esHits >= 2 ? "es" : "en";
}
const HAZARD_KEYWORDS = [
  "exposed wir",
  "cable pelado",
  "cable expuesto",
  "gas",
  "spark",
  "chispa",
  "water near outlet",
  "agua cerca",
  "standing water",
  "agua estancada",
  "crack",
  "grieta",
] as const;

export interface CopilotInput {
  question: string;
  spec: AiSpec;
  frameNote?: string;
  lang?: "en" | "es";
}

/**
 * S8 Pro Copilot: answer a job-site question grounded in the spec.
 * Mock-first (no key): deterministic answer citing the current step.
 */
export async function answerCopilot(input: CopilotInput): Promise<{ answer: CopilotAnswer; mock: boolean }> {
  const question = input.question.trim().slice(0, 500);
  const lang = input.lang ?? guessLang(question);
  const step = input.spec.steps.find((s) => question.toLowerCase().split(/\s+/).some((w) => w.length > 4 && s.toLowerCase().includes(w))) ?? input.spec.steps[0] ?? null;
  const mock: CopilotAnswer = {
    answer:
      lang === "es"
        ? `Según la cotización (${input.spec.title}): ${step ?? "sigue el plan"}. Materiales: ${input.spec.materials.slice(0, 3).join(", ") || "los listados"}.`
        : `Per the job spec (${input.spec.title}): ${step ?? "follow the plan"}. Materials: ${input.spec.materials.slice(0, 3).join(", ") || "as listed"}.`,
    safety_note: input.spec.safety_flags[0] ?? null,
    relates_to_step: step,
  };
  if (!process.env.MODEL_API_KEY) return { answer: mock, mock: true };
  try {
    const client = museClient();
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        { role: "system", content: loadCopilotPrompt() },
        {
          role: "user",
          content: `Job spec:\n${JSON.stringify(input.spec)}\nFrame: ${input.frameNote ?? "(no frame)"}\nQuestion (${lang}): ${question}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });
    const raw = res.choices[0]?.message?.content ?? "";
    const parsed = CopilotAnswer.safeParse(JSON.parse(raw));
    if (parsed.success) return { answer: parsed.data, mock: false };
    // Validation failed: retry once with the error in the prompt (AGENTS §6).
    const retry = await client.chat.completions.create({
      model: modelId(),
      messages: [
        { role: "system", content: loadCopilotPrompt() },
        {
          role: "user",
          content: `Previous output failed validation. Return ONLY valid JSON matching {answer, safety_note, relates_to_step}. Job spec:\n${JSON.stringify(input.spec)}\nQuestion (${lang}): ${question}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });
    const reparsed = CopilotAnswer.safeParse(JSON.parse(retry.choices[0]?.message?.content ?? ""));
    if (reparsed.success) return { answer: reparsed.data, mock: false };
  } catch {
    /* fall through to mock */
  }
  return { answer: mock, mock: true };
}

export interface HazardInput {
  spec: AiSpec;
  /** Short description of the current frame (from glasses/phone), or "" when none. */
  frameNote?: string;
  lang?: "en" | "es";
}

/**
 * S8 hazard watch: check one frame for visible hazards. Advisory only —
 * never blocks the job, never certifies safety. The caller logs an event
 * and speaks the warning only when `safe` is false.
 */
export async function watchHazards(input: HazardInput): Promise<{ watch: HazardWatch; mock: boolean }> {
  const haystack = `${input.frameNote ?? ""} ${(input.spec.safety_flags ?? []).join(" ")}`.toLowerCase();
  const found = HAZARD_KEYWORDS.filter((k) => haystack.includes(k));
  const lang = input.lang ?? guessLang(input.frameNote ?? "");
  const mock: HazardWatch =
    found.length > 0
      ? {
          safe: false,
          hazards: found.slice(0, 3).map((f) => `possible ${f} (advisory) / posible ${f} (aviso)`),
          warning:
            lang === "es"
              ? `Aviso: posible riesgo (${found[0]}). Detén el trabajo y verifica antes de continuar.`
              : `Advisory: possible hazard (${found[0]}). Stop work and verify before continuing.`,
        }
      : { safe: true, hazards: [], warning: null };
  if (!process.env.MODEL_API_KEY) return { watch: mock, mock: true };
  try {
    const client = museClient();
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        { role: "system", content: loadCopilotPrompt() },
        {
          role: "user",
          content: `HAZARD CHECK. Job spec:\n${JSON.stringify(input.spec)}\nFrame: ${input.frameNote ?? "(no frame)"}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });
    const parsed = HazardWatch.safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
    if (parsed.success) return { watch: parsed.data, mock: false };
  } catch {
    /* fall through */
  }
  return { watch: mock, mock: true };
}
