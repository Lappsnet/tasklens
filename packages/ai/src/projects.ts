import { z } from "zod";
import { museClient, modelId } from "./client.js";
import type { AiSpec } from "./schemas.js";

export const ProjectPhase = z.object({
  trade: z.string(),
  title: z.string(),
  scope: z.string(),
  est_days: z.number().min(0.25).max(60),
  budget_low_usd: z.number().int().nonnegative(),
  budget_high_usd: z.number().int().nonnegative(),
  materials: z.array(z.string()).max(30),
  risks: z.array(z.string()).max(10).default([]),
});
export type ProjectPhase = z.infer<typeof ProjectPhase>;

export const ProjectPlan = z.object({
  title: z.string(),
  phases: z.array(ProjectPhase).min(1).max(10),
  total_low_usd: z.number().int().nonnegative(),
  total_high_usd: z.number().int().nonnegative(),
  summary: z.string(),
});
export type ProjectPlan = z.infer<typeof ProjectPlan>;

export interface PlanInput {
  spec: AiSpec;
  transcript: string;
}

/** Deterministic S4 plan (mock): 5-phase bathroom remodel in trade order. */
export function mockProjectPlan(input: PlanInput): ProjectPlan {
  const t = input.transcript || input.spec.title;
  const phases: ProjectPhase[] = [
    { trade: "plumbing", title: "Demolition + rough plumbing", scope: `Strip fixtures per walkthrough (${t.slice(0, 60)}). Cap lines, rough-in new runs.`, est_days: 2, budget_low_usd: 400, budget_high_usd: 700, materials: ["PEX kit", "shut-off valves"], risks: ["Hidden corrosion behind walls"] },
    { trade: "electrical", title: "Electrical rough-in", scope: "GFCI circuit, vanity + shower lighting, exhaust fan.", est_days: 1.5, budget_low_usd: 300, budget_high_usd: 550, materials: ["12/2 Romex", "GFCI outlet", "LED vanity bar"], risks: ["Live circuits in old boxes"] },
    { trade: "drywall_paint", title: "Drywall + waterproofing", scope: "Cement board in wet zone, tape, prime.", est_days: 2, budget_low_usd: 350, budget_high_usd: 600, materials: ["cement board", "waterproof membrane"], risks: [] },
    { trade: "drywall_paint", title: "Tile + paint", scope: "Floor + shower tile, grout, seal, paint.", est_days: 3, budget_low_usd: 800, budget_high_usd: 1400, materials: ["tile", "thinset", "grout", "sealer"], risks: ["Subfloor unevenness"] },
    { trade: "assembly", title: "Fixtures + finish", scope: "Set toilet, vanity, mirror, accessories; final clean.", est_days: 1, budget_low_usd: 250, budget_high_usd: 450, materials: ["wax ring", "supply lines"], risks: [] },
  ];
  const lo = phases.reduce((a, p) => a + p.budget_low_usd, 0);
  const hi = phases.reduce((a, p) => a + p.budget_high_usd, 0);
  return {
    title: `Remodel: ${input.spec.title}`,
    phases,
    total_low_usd: lo,
    total_high_usd: hi,
    summary: `5 phases in trade order (plumbing → electrical → drywall → tile → finish). Mock estimate USD ${lo}–${hi}.`,
  };
}

/** Muse drafts the ProjectPlan from walkthrough frames + transcript. Validated with Zod. */
export async function draftProjectPlan(input: PlanInput & { images: string[] }): Promise<{ plan: ProjectPlan; mock: boolean }> {
  if (!process.env.MODEL_API_KEY) return { plan: mockProjectPlan(input), mock: true };
  const client = museClient();
  try {
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        {
          role: "system",
          content: "You plan remodels from walkthrough frames. Return ONLY valid JSON: {title, phases: [{trade, title, scope, est_days, budget_low_usd, budget_high_usd, materials[], risks[]}], total_low_usd, total_high_usd, summary}. Phases in trade order (demolition → plumbing → electrical → drywall → tile → finish). Trades must be one of: plumbing, electrical, appliance, drywall_paint, assembly, cleaning.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Walkthrough transcript:\n${input.transcript || "(no transcript)"}\nBase spec: ${JSON.stringify(input.spec)}` },
            ...input.images.slice(0, 8).map((img) => ({ type: "image_url" as const, image_url: { url: img } })),
          ] as never,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2500,
    });
    const parsed = ProjectPlan.safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
    if (parsed.success) return { plan: parsed.data, mock: false };
  } catch {
    /* fall through to mock */
  }
  return { plan: mockProjectPlan(input), mock: true };
}
