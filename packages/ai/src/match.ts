import { readFileSync } from "node:fs";
import { z } from "zod";
import { museClient, modelId, fallbackModelId, isProduction } from "./client.js";
import { AiSpec } from "./schemas.js";

export const ProTool = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  rating: z.number(),
  lat: z.number(),
  lng: z.number(),
  next_available: z.string(),
});

export const MatchResult = z.object({
  top3: z.array(
    z.object({
      pro_id: z.string(),
      reason: z.string(),
      eta_days: z.number(),
      quote_usd: z.number(),
    }),
  ),
});

export type MatchResult = z.infer<typeof MatchResult>;

/**
 * Day 1 stub: deterministic ranking (rating desc) so CLI/E2E works without DB.
 * Day 3 replaces with agent loop: tools search_pros / get_availability / create_booking.
 */
export function rankPros(args: {
  category: string;
  pros: { id: string; name: string; category: string; rating: number }[];
}): MatchResult {
  const filtered = args.pros.filter((p) => p.category === args.category);
  const pool = (filtered.length ? filtered : args.pros).slice().sort((a, b) => b.rating - a.rating).slice(0, 3);
  return {
    top3: pool.map((p, i) => ({
      pro_id: p.id,
      reason: `${p.name} — ${p.rating.toFixed(1)}★, matches ${args.category}`,
      eta_days: i + 1,
      quote_usd: 150 + i * 50,
    })),
  };
}

// --- Day 3: agent loop ---

export const ProCandidate = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  rating: z.number(),
  rate_usd_hr: z.number().optional(),
  city: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type ProCandidate = z.infer<typeof ProCandidate>;

/** Tools the model may call. Host (web route) injects real implementations. */
export interface MatcherTools {
  search_pros: (args: { category: string; lat: number; lng: number; max_km: number }) => Promise<ProCandidate[]>;
  get_availability: (args: { pro_id: string; date_range: string }) => Promise<string[]>;
  create_booking: (args: { pro_id: string; slot: string; scan_id: string }) => Promise<{ job_id: string }>;
}

export const MatchAgentInput = z.object({
  spec: AiSpec,
  lat: z.number().default(13.6929),
  lng: z.number().default(-89.2182),
  max_km: z.number().default(25),
  scan_id: z.string(),
  /** Explicit customer confirmation. Booking NEVER happens without it. */
  confirm: z.object({ pro_id: z.string(), slot: z.string() }).optional(),
});
export type MatchAgentInput = z.infer<typeof MatchAgentInput>;

export const Booking = z.object({
  job_id: z.string(),
  pro_id: z.string(),
  slot: z.string(),
});
export type Booking = z.infer<typeof Booking>;

function matchPrompt(): string {
  try {
    return readFileSync(new URL("../prompts/match.md", import.meta.url), "utf8");
  } catch {
    return "You match a home-service job to nearby pros. Prefer matching category, high rating, and availability. Return top 3 with one-line reasons. Never book without explicit customer confirmation. Output ONLY valid JSON matching the schema.";
  }
}

const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "search_pros",
      description: "Find pros by category near a location.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          lat: { type: "number" },
          lng: { type: "number" },
          max_km: { type: "number" },
        },
        required: ["category", "lat", "lng", "max_km"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_availability",
      description: "Get open slots for a pro, e.g. date_range '2026-10-30/2026-11-06'.",
      parameters: {
        type: "object",
        properties: { pro_id: { type: "string" }, date_range: { type: "string" } },
        required: ["pro_id", "date_range"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_booking",
      description: "Book a pro. ONLY call when the customer explicitly confirmed pro_id and slot.",
      parameters: {
        type: "object",
        properties: {
          pro_id: { type: "string" },
          slot: { type: "string" },
          scan_id: { type: "string" },
        },
        required: ["pro_id", "slot", "scan_id"],
      },
    },
  },
];

function demoMode(): boolean {
  if (isProduction()) return false;
  return process.env.DEMO_MODE === "true" || !process.env.MODEL_API_KEY;
}

/**
 * Day 3 agent loop. Searches pros, checks availability, ranks top 3.
 * Calls create_booking ONLY when input.confirm is present (explicit customer
 * confirmation enforced in code, not just in the prompt).
 */
export async function matchAndBook(
  input: MatchAgentInput,
  tools: MatcherTools,
): Promise<{ top3: MatchResult["top3"]; booking: Booking | null; mock: boolean }> {
  if (demoMode()) {
    const pros = await tools.search_pros({
      category: input.spec.category,
      lat: input.lat,
      lng: input.lng,
      max_km: input.max_km,
    });
    const ranked = rankPros({
      category: input.spec.category,
      pros: pros.map((p) => ({ id: p.id, name: p.name, category: p.category, rating: p.rating })),
    });
    // Server-side quote from category rate: deterministic demo pricing.
    const top3 = ranked.top3.map((t, i) => {
      const pro = pros.find((p) => p.id === t.pro_id);
      const base = Math.round((pro?.rate_usd_hr ?? 75) * input.spec.est_hours);
      return { ...t, quote_usd: base + i * 25 };
    });
    let booking: Booking | null = null;
    if (input.confirm) {
      const { job_id } = await tools.create_booking({
        pro_id: input.confirm.pro_id,
        slot: input.confirm.slot,
        scan_id: input.scan_id,
      });
      booking = { job_id, pro_id: input.confirm.pro_id, slot: input.confirm.slot };
    }
    return { top3, booking, mock: true };
  }

  const client = museClient();
  const models = [modelId(), fallbackModelId()];
  let lastErr: unknown = null;
  for (const model of models) {
    try {
      interface Msg {
        role: "system" | "user" | "assistant" | "tool";
        content?: string | null;
        tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
        tool_call_id?: string;
      }
      const messages: Msg[] = [
        { role: "system", content: matchPrompt() },
        {
          role: "user",
          content: [
            `Job spec: ${JSON.stringify(input.spec)}`,
            `Location: ${input.lat},${input.lng} (max ${input.max_km} km). Scan: ${input.scan_id}.`,
            input.confirm
              ? `Customer CONFIRMED booking: pro ${input.confirm.pro_id} at ${input.confirm.slot}. Call create_booking, then return the top-3 JSON.`
              : "No booking confirmed. Do NOT call create_booking. Return the top-3 JSON only.",
          ].join("\n"),
        },
      ];
      let booking: Booking | null = null;
      for (let step = 0; step < 6; step++) {
        const res = await client.chat.completions.create({
          model,
          messages: messages as never,
          tools: TOOL_DEFS as never,
          tool_choice: "auto",
          max_tokens: 1200,
        });
        const msg = res.choices[0]?.message as unknown as {
          content?: string | null;
          tool_calls?: { id: string; function: { name: string; arguments: string } }[];
        };
        const calls = msg.tool_calls ?? [];
        if (calls.length > 0) {
          messages.push({
            role: "assistant",
            content: msg.content ?? null,
            tool_calls: calls.map((c) => ({ id: c.id, type: "function" as const, function: c.function })),
          });
          for (const call of calls) {
            const args = JSON.parse(call.function.arguments || "{}");
            let result: unknown;
            if (call.function.name === "search_pros") result = await tools.search_pros(args);
            else if (call.function.name === "get_availability") result = await tools.get_availability(args);
            else if (call.function.name === "create_booking") {
              // Code-level guard: never book without explicit customer confirmation,
              // and only the confirmed pro/slot.
              if (!input.confirm || args.pro_id !== input.confirm.pro_id || args.slot !== input.confirm.slot) {
                result = { error: "booking_not_confirmed" };
              } else {
                const { job_id } = await tools.create_booking({ ...args, scan_id: input.scan_id });
                booking = { job_id, pro_id: args.pro_id, slot: args.slot };
                result = { job_id };
              }
            } else result = { error: "unknown_tool" };
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
          }
          continue;
        }
        const parsed = MatchResult.safeParse(JSON.parse(msg.content ?? ""));
        if (parsed.success) return { top3: parsed.data.top3, booking, mock: false };
        messages.push({
          role: "user",
          content: `Previous output failed validation: ${parsed.error.message}. Return ONLY the MatchResult JSON.`,
        });
      }
      throw new Error("agent loop exhausted without valid MatchResult");
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`matchAndBook failed: ${String(lastErr)}`);
}
