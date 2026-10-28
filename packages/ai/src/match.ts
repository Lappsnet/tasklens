import { z } from "zod";

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
