import { z } from "zod";
import { museClient, modelId } from "./client.js";
import type { AiSpec } from "./schemas.js";

export const SlotSuggestion = z.object({
  slot: z.string(),
  reason: z.string(),
  eta_min: z.number(),
});
export type SlotSuggestion = z.infer<typeof SlotSuggestion>;

export interface DayJob {
  jobId: string;
  slot: string;
  title: string;
  address?: string;
  materials: string[];
  lat?: number;
  lng?: number;
}

/** Haversine km (mock travel-time until Mapbox Matrix key). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLa = ((bLat - aLat) * Math.PI) / 180;
  const dLo = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

function urgencyRank(u: AiSpec["urgency"]): number {
  return { emergency: 0, high: 1, medium: 2, low: 3 }[u];
}

/**
 * S2: propose the 3 best slots from candidate availability, urgency, existing
 * jobs and travel distance. Deterministic mock; Muse polish when keyed.
 */
export async function suggestSlots(args: {
  spec: AiSpec;
  candidates: { slot: string; proLat?: number; proLng?: number }[];
  homeLat: number;
  homeLng: number;
  busySlots: string[];
}): Promise<{ slots: SlotSuggestion[]; mock: boolean }> {
  const free = args.candidates.filter((c) => !args.busySlots.includes(c.slot)).slice(0, 12);
  const ranked = free
    .map((c) => {
      const km = distanceKm(args.homeLat, args.homeLng, c.proLat ?? args.homeLat, c.proLng ?? args.homeLng);
      const eta = Math.round(15 + km * 2.5 + urgencyRank(args.spec.urgency) * 10);
      return { slot: c.slot, reason: `${km.toFixed(1)} km away, ~${eta} min travel`, eta_min: eta, km };
    })
    .sort((a, b) => a.km - b.km || urgencyRank(args.spec.urgency))
    .slice(0, 3)
    .map(({ slot, reason, eta_min }) => ({ slot, reason, eta_min }));

  if (!process.env.MODEL_API_KEY) return { slots: ranked, mock: true };
  try {
    const client = museClient();
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        { role: "system", content: "You rank repair appointment slots. Output ONLY JSON: {\"slots\": [{\"slot\": string, \"reason\": string, \"eta_min\": number}]}. Max 3, one-line reasons mentioning urgency and travel." },
        { role: "user", content: JSON.stringify({ urgency: args.spec.urgency, est_hours: args.spec.est_hours, ranked }) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });
    const parsed = z.object({ slots: z.array(SlotSuggestion).max(3) }).safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
    if (parsed.success && parsed.data.slots.length > 0) return { slots: parsed.data.slots, mock: false };
  } catch {
    /* fall through to deterministic ranking */
  }
  return { slots: ranked, mock: true };
}

/** S2: morning briefing for the pro's day. Template mock; Muse polish when keyed. */
export async function briefDay(args: { date: string; jobs: DayJob[]; proName: string }): Promise<{ text: string; mock: boolean }> {
  const n = args.jobs.length;
  const mats = [...new Set(args.jobs.flatMap((j) => j.materials))].slice(0, 12);
  const first = args.jobs[0];
  const mockText =
    n === 0
      ? `${args.date}: no jobs scheduled. Restock the van and confirm tomorrow's slots.`
      : `${args.date}: ${n} job${n > 1 ? "s" : ""} today${first ? `, first at ${first.slot} — ${first.title}` : ""}. Bring: ${mats.join(", ") || "standard kit"}.`;
  if (!process.env.MODEL_API_KEY) return { text: mockText, mock: true };
  try {
    const client = museClient();
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        { role: "system", content: "You write a 3-sentence spoken morning briefing for a repair pro (glasses TTS). Plain language, times first, materials checklist last." },
        { role: "user", content: mockText },
      ],
      max_tokens: 200,
    });
    const text = res.choices[0]?.message?.content?.trim();
    if (text) return { text, mock: false };
  } catch {
    /* fall through */
  }
  return { text: mockText, mock: true };
}
