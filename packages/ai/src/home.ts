import { z } from "zod";
import { museClient, modelId } from "./client.js";

export const ReminderDraft = z.object({
  title: z.string(),
  due_in_days: z.number().int().min(1).max(3650),
  reason: z.string(),
});
export type ReminderDraft = z.infer<typeof ReminderDraft>;

export interface PassportLike {
  entryId: string;
  category: string;
  title: string;
  completedAt: string;
}

/** Deterministic maintenance-radar rules per trade (months → days). */
const RULES: Record<string, { months: number; title: string }> = {
  plumbing: { months: 12, title: "Revisar el calentador y buscar fugas / Check heater and leaks" },
  electrical: { months: 12, title: "Revisar tablero y conexiones / Check panel and connections" },
  appliance: { months: 6, title: "Mantenimiento del equipo / Appliance maintenance" },
  drywall_paint: { months: 24, title: "Retocar pintura / Touch up paint" },
  assembly: { months: 12, title: "Reapretar muebles / Re-tighten furniture" },
  cleaning: { months: 1, title: "Limpieza de mantenimiento / Maintenance cleaning" },
};

/**
 * S3 maintenance radar: Muse reads the passport and proposes reminders.
 * Deterministic rules first; Muse rephrases when a key is set.
 */
export async function radarSuggestions(entries: PassportLike[]): Promise<{ reminders: ReminderDraft[]; mock: boolean }> {
  const base: ReminderDraft[] = entries.map((e) => {
    const rule = RULES[e.category] ?? { months: 12, title: "Revisión general / General checkup" };
    return {
      title: `${rule.title} — ${e.title}`,
      due_in_days: rule.months * 30,
      reason: `Based on completed ${e.category} work (${e.entryId.slice(0, 8)}…).`,
    };
  });
  if (!process.env.MODEL_API_KEY) return { reminders: base, mock: true };
  try {
    const client = museClient();
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        { role: "system", content: "You turn completed home repairs into maintenance reminders. Output ONLY JSON: {\"reminders\": [{\"title\": string, \"due_in_days\": number, \"reason\": string}]}. Bilingual titles (ES / EN)." },
        { role: "user", content: JSON.stringify(base) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });
    const parsed = z.object({ reminders: z.array(ReminderDraft).max(10) }).safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
    if (parsed.success) return { reminders: parsed.data.reminders, mock: false };
  } catch {
    /* fall through */
  }
  return { reminders: base, mock: true };
}
