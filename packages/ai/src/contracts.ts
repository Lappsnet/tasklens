import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { museClient, modelId, fallbackModelId } from "./client.js";
import type { AiSpec } from "./schemas.js";

export const ContractDraft = z.object({
  title: z.string(),
  body_es: z.string().min(50),
  body_en: z.string().min(50),
  summary_es: z.string().min(10),
  summary_en: z.string().min(10),
  price_usd: z.number(),
  warranty_days: z.number().int().min(0).max(365),
});
export type ContractDraft = z.infer<typeof ContractDraft>;

const clauseCache = new Map<string, string>();
/** Filesystem probing (no import.meta.url: webpack can't statically resolve it
 * and fails the web build). Works from CLI, tests, dev and prod server. */
function loadClauses(): { name: string; text: string }[] {
  if (clauseCache.size > 0) return [...clauseCache].map(([name, text]) => ({ name, text }));
  const out: { name: string; text: string }[] = [];
  const cwd = process.cwd();
  const dirs = [
    join(cwd, "contracts", "clauses"), // cwd = packages/ai (tests)
    join(cwd, "packages", "ai", "contracts", "clauses"), // cwd = repo root (CLI)
    join(cwd, "..", "..", "packages", "ai", "contracts", "clauses"), // cwd = apps/web (server)
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      for (const f of readdirSync(dir).sort()) {
        if (!f.endsWith(".md")) continue;
        const text = readFileSync(join(dir, f), "utf8");
        if (!clauseCache.has(f)) {
          clauseCache.set(f, text);
          out.push({ name: f, text });
        }
      }
      if (out.length > 0) break;
    } catch {
      /* try next candidate */
    }
  }
  if (out.length === 0) {
    out.push(
      { name: "scope.md", text: "Scope: {steps}. Price: USD {price_usd}. Warranty: {warranty_days} days labor." },
      { name: "legal.md", text: "Plantilla generada con IA; no constituye asesoría legal. / AI-generated template; not legal advice." },
    );
  }
  return out;
}

export function clauseNames(): string[] {
  return loadClauses().map((c) => c.name);
}

export interface ContractInput {
  spec: AiSpec;
  jobId: string;
  proName: string;
  customerName: string;
  slot: string;
  priceUsd: number;
  warrantyDays?: number;
}

function fillTemplate(text: string, v: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? `{${k}}`);
}

function renderBilingual(input: ContractInput, lang: "es" | "en"): string {
  const vals: Record<string, string> = {
    customer_name: input.customerName,
    pro_name: input.proName,
    job_title: input.spec.title,
    job_id: input.jobId,
    steps: input.spec.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    materials: input.spec.materials.join(", ") || "—",
    materials_by: "Customer / Cliente",
    price_usd: String(input.priceUsd),
    slot: input.slot,
    warranty_days: String(input.warrantyDays ?? 30),
  };
  const clauses = loadClauses();
  const body = clauses.map((c) => fillTemplate(c.text, vals)).join("\n\n");
  return lang === "es"
    ? `${body}\n\nPlantilla generada con IA; no constituye asesoría legal.`
    : `${body}\n\nAI-generated template; not legal advice.`;
}

/** Deterministic S1 draft (no API key). The model path produces the same shape. */
export function mockContractDraft(input: ContractInput): ContractDraft {
  const summary = (lang: "es" | "en") =>
    lang === "es"
      ? [
          `1. ${input.proName} hará: ${input.spec.title}.`,
          `2. Precio fijo USD ${input.priceUsd}, retenido hasta verificación.`,
          `3. Inicio: ${input.slot}; garantía ${input.warrantyDays ?? 30} días de mano de obra.`,
          `4. Extras solo con orden de cambio firmada.`,
          `5. Disputas: propuesta IA, decide un humano.`,
        ].join("\n")
      : [
          `1. ${input.proName} will do: ${input.spec.title}.`,
          `2. Fixed price USD ${input.priceUsd}, held until verification.`,
          `3. Start: ${input.slot}; ${input.warrantyDays ?? 30}-day labor warranty.`,
          `4. Extras only via signed change order.`,
          `5. Disputes: AI proposes, a human decides.`,
        ].join("\n");
  return {
    title: `${input.spec.title} — ${input.customerName} / ${input.proName}`,
    body_es: renderBilingual(input, "es"),
    body_en: renderBilingual(input, "en"),
    summary_es: summary("es"),
    summary_en: summary("en"),
    price_usd: input.priceUsd,
    warranty_days: input.warrantyDays ?? 30,
  };
}

/** Muse Spark fills/selects ONLY the fixed clause library. Validated with Zod. */
export async function draftContract(input: ContractInput): Promise<{ draft: ContractDraft; mock: boolean }> {
  if (!process.env.MODEL_API_KEY) return { draft: mockContractDraft(input), mock: true };
  const client = museClient();
  const models = [modelId(), fallbackModelId()];
  const clauses = loadClauses()
    .map((c) => `--- ${c.name} ---\n${c.text}`)
    .join("\n");
  let lastErr: unknown = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: [
                "You draft bilingual (ES/EN) home-service agreements from a FIXED clause library.",
                "Fill ONLY the {placeholders} with the job facts below. Never invent clauses.",
                "Output ONLY valid JSON: {title, body_es, body_en, summary_es, summary_en, price_usd, warranty_days}.",
                "summary_* is the agreement in exactly 5 numbered lines. Both bodies end with the AI-template disclaimer.",
              ].join("\n"),
            },
            {
              role: "user",
              content: `CLAUSES:\n${clauses}\n\nJOB:\n${JSON.stringify({ ...input, spec: input.spec })}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2500,
        });
        const parsed = ContractDraft.safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
        if (!parsed.success) throw new Error("ContractDraft validation failed: " + parsed.error.message);
        return { draft: parsed.data, mock: false };
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw new Error(`draftContract failed: ${String(lastErr)}`);
}
