import { z } from "zod";
import { museClient, modelId } from "./client.js";

export const CityCategory = z.enum([
  "street_light",
  "water_leak",
  "road",
  "sidewalk",
  "waste",
  "drainage",
  "other",
]);
export type CityCategory = z.infer<typeof CityCategory>;

export const CityTriage = z.object({
  category: CityCategory,
  severity: z.enum(["low", "medium", "high", "urgent"]),
  title_es: z.string().min(4).max(120),
  summary_es: z.string().min(4).max(500),
  /** True when people are the subject of the photo — reject, never store. */
  person_subject: z.boolean(),
  suggested_trade: z.string().min(1).max(40),
  sla_hours: z.number().int().min(1).max(720),
});
export type CityTriage = z.infer<typeof CityTriage>;

const SEVERITY_SLA: Record<CityTriage["severity"], number> = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168,
};

/**
 * S7: Muse Spark triages a public-issue report (text + optional photo context).
 * Faces/plates are never stored: when people are the subject, the report is
 * rejected before persistence. Mock fallback when keyless.
 */
export async function triageReport(input: {
  description: string;
  city: string;
  /** Optional data-URL image for the person-subject check (real model path). */
  imageDataUrl?: string;
}): Promise<{ triage: CityTriage; mock: boolean }> {
  const mock: CityTriage = mockTriage(input.description);
  if (!process.env.MODEL_API_KEY) return { triage: mock, mock: true };
  try {
    const client = museClient();
    const userContent: ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[] = [
      { type: "text", text: `City: ${input.city}. Report: ${input.description}` },
    ];
    if (input.imageDataUrl) userContent.push({ type: "image_url", image_url: { url: input.imageDataUrl } });
    const res = await client.chat.completions.create({
      model: modelId(),
      messages: [
        {
          role: "system",
          content:
            "You triage a city public-issue report (street light, water leak in the street, broken sidewalk/road, waste, drainage). " +
            "Look at the photo if present: if PEOPLE are the subject, set person_subject true. " +
            "Output ONLY JSON: {category, severity (low|medium|high|urgent), title_es, summary_es, person_subject, suggested_trade (plumbing|electrical|appliance|drywall_paint|assembly|cleaning|other), sla_hours (urgent=4, high=24, medium=72, low=168)}. " +
            "Gas, live wiring or structural risk -> severity urgent.",
        },
        { role: "user", content: userContent as never },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    const parsed = CityTriage.safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
    if (parsed.success) return { triage: parsed.data, mock: false };
  } catch {
    /* fall through */
  }
  return { triage: mock, mock: true };
}

function mockTriage(description: string): CityTriage {
  const d = description.toLowerCase();
  const has = (...words: string[]) => words.some((w) => d.includes(w));
  let category: CityCategory = "other";
  if (has("luz", "light", "alumbrado", "poste", "luminaria")) category = "street_light";
  else if (has("agua", "water", "fuga", "leak", "tubería", "alcantarilla")) category = "water_leak";
  else if (has("calle", "road", "bache", "pothole", "asfalto")) category = "road";
  else if (has("acera", "sidewalk", "banqueta")) category = "sidewalk";
  else if (has("basura", "waste", "trash", "desechos")) category = "waste";
  else if (has("drenaje", "drainage", "inund")) category = "drainage";
  const severity: CityTriage["severity"] = has("urgente", "urgent", "peligro", "danger", "gas", "electric", "electri", "derrumbe", "collapse")
    ? "urgent"
    : has("grande", "major", "bloquea", "blocked", "toda la calle")
      ? "high"
      : has("pequeño", "small", "minor", "leve")
        ? "low"
        : "medium";
  const trade =
    category === "water_leak" ? "plumbing" : category === "street_light" ? "electrical" : "other";
  return {
    category,
    severity,
    title_es: description.slice(0, 80) || "Reporte ciudadano",
    summary_es: description.slice(0, 300) || "Sin descripción.",
    person_subject: false,
    suggested_trade: trade,
    sla_hours: SEVERITY_SLA[severity],
  };
}
