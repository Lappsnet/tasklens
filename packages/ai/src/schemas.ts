import { z } from "zod";

export const JobCategory = z.enum([
  "plumbing",
  "electrical",
  "appliance",
  "drywall_paint",
  "assembly",
  "cleaning",
]);

export const DamageBox = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const AiSpec = z.object({
  category: JobCategory,
  title: z.string().min(3).max(120),
  diagnosis: z.string().min(10).max(2000),
  urgency: z.enum(["low", "medium", "high", "emergency"]),
  skill_level: z.enum(["handyman", "licensed_pro"]),
  est_hours: z.number().min(0.25).max(80),
  materials: z.array(z.string()).max(30),
  price_range_usd: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
  steps: z.array(z.string()).min(1).max(20),
  safety_flags: z.array(z.string()).max(10),
  questions_for_customer: z.array(z.string()).max(10),
  damage_box: DamageBox.nullable(),
  confidence: z.number().min(0).max(1),
});

export type AiSpec = z.infer<typeof AiSpec>;
export type JobCategory = z.infer<typeof JobCategory>;

export const VerifyCheck = z.object({
  step: z.string(),
  passed: z.boolean(),
  evidence: z.string(),
});

export const VerifyResult = z.object({
  verdict: z.enum(["pass", "review"]),
  checks: z.array(VerifyCheck),
  summary: z.string(),
});

export type VerifyResult = z.infer<typeof VerifyResult>;

/** JSON Schema for Model API structured output (response_format.json_schema). */
export function aiSpecJsonSchema() {
  return {
    name: "AiSpec",
    strict: false,
    schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["plumbing", "electrical", "appliance", "drywall_paint", "assembly", "cleaning"] },
        title: { type: "string" },
        diagnosis: { type: "string" },
        urgency: { type: "string", enum: ["low", "medium", "high", "emergency"] },
        skill_level: { type: "string", enum: ["handyman", "licensed_pro"] },
        est_hours: { type: "number" },
        materials: { type: "array", items: { type: "string" } },
        price_range_usd: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
        steps: { type: "array", items: { type: "string" } },
        safety_flags: { type: "array", items: { type: "string" } },
        questions_for_customer: { type: "array", items: { type: "string" } },
        damage_box: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: {
                x: { type: "number" }, y: { type: "number" },
                w: { type: "number" }, h: { type: "number" },
              },
              required: ["x", "y", "w", "h"],
            },
          ],
        },
        confidence: { type: "number" },
      },
      required: ["category", "title", "diagnosis", "urgency", "skill_level", "est_hours", "materials", "price_range_usd", "steps", "safety_flags", "questions_for_customer", "damage_box", "confidence"],
      additionalProperties: false,
    },
  } as const;
}

export function verifyResultJsonSchema() {
  return {
    name: "VerifyResult",
    strict: false,
    schema: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["pass", "review"] },
        checks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "string" },
              passed: { type: "boolean" },
              evidence: { type: "string" },
            },
            required: ["step", "passed", "evidence"],
            additionalProperties: false,
          },
        },
        summary: { type: "string" },
      },
      required: ["verdict", "checks", "summary"],
      additionalProperties: false,
    },
  } as const;
}
