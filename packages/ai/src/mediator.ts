import { z } from "zod";
import { museClient, modelId } from "./client.js";

export const MediationProposal = z.object({
  kind: z.enum(["redo", "partial_release"]),
  detail: z.string(),
  amount_usd: z.number().int().nonnegative().nullable(),
  rationale: z.string(),
});
export type MediationProposal = z.infer<typeof MediationProposal>;

export interface MediationInput {
  scope: string[];
  changeOrders: { description: string; price_delta_usd: number; status: string }[];
  checks: { step: string; passed: boolean; evidence: string }[];
  amountUsd: number;
}

/**
 * S6 fair-fix: Muse compares signed scope, change orders and verification
 * checks, then proposes redo steps or a partial release. The AI never pays,
 * captures or closes anything — a human accepts first.
 */
export async function proposeResolution(input: MediationInput): Promise<{ proposal: MediationProposal; mock: boolean }> {
  const failed = input.checks.filter((c) => !c.passed);
  const mock: MediationProposal =
    failed.length > 0
      ? {
          kind: "redo",
          detail: `Redo: ${failed.map((f) => f.step).join("; ")}`,
          amount_usd: null,
          rationale: "Mock: failed verification steps should be redone before any release.",
        }
      : {
          kind: "partial_release",
          detail: "Release 70% for completed scope; void the rest.",
          amount_usd: Math.round(input.amountUsd * 0.7),
          rationale: "Mock: all checks passed but the job is disputed — release most, void the rest.",
        };
  if (!process.env.MODEL_API_KEY) return { proposal: mock, mock: true };
  try {
    const client = museClient();
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        { role: "system", content: "You mediate a home-repair dispute. Compare scope, change orders and verification checks. Output ONLY JSON: {kind: \"redo\"|\"partial_release\", detail: string, amount_usd: number|null, rationale: string}. For redo, amount_usd is null. For partial_release, amount_usd is the release amount in USD. You never move money." },
        { role: "user", content: JSON.stringify(input) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });
    const parsed = MediationProposal.safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
    if (parsed.success) return { proposal: parsed.data, mock: false };
  } catch {
    /* fall through */
  }
  return { proposal: mock, mock: true };
}
