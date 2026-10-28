#!/usr/bin/env node
/**
 * Day 1 CLI: scanToSpec
 * Usage:
 *   pnpm --filter @tasklens/ai cli -- --image ./photo.jpg --transcript "leak under sink" --lang en
 *   pnpm --filter @tasklens/ai cli -- --mock   (no API key, deterministic fixture)
 */
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const get = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const t0 = Date.now();
  if (args.includes("--mock")) {
    const fixture = {
      category: "plumbing",
      title: "Leaking P-trap under kitchen sink",
      diagnosis: "Mock: P-trap washer failed; slow drip corroding cabinet floor.",
      urgency: "medium",
      skill_level: "handyman",
      est_hours: 1.5,
      materials: ["P-trap kit 1.5in", "plumber's tape", "bucket"],
      price_range_usd: [120, 220],
      steps: ["Shut off water", "Replace P-trap", "Leak test", "Clean cabinet"],
      safety_flags: [],
      questions_for_customer: ["Is the leak active now? / ¿La fuga está activa ahora?"],
      damage_box: { x: 0.3, y: 0.5, w: 0.4, h: 0.3 },
      confidence: 0.82,
    };
    console.log(JSON.stringify(fixture, null, 2));
    console.error(`[mock] done in ${Date.now() - t0}ms`);
    return;
  }

  const imagePath = get("image");
  const transcript = get("transcript") ?? "";
  const lang = (get("lang") as "en" | "es") ?? "en";
  if (!imagePath) throw new Error("Missing --image <path> (or use --mock)");

  const buf = readFileSync(imagePath);
  const ext = imagePath.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpeg";
  const dataUrl = `data:image/${ext};base64,${buf.toString("base64")}`;

  const { scanToSpec } = await import("../index.js");
  console.error("Looking... (uploading photo)");
  const t1 = Date.now();
  const spec = await scanToSpec({ images: [dataUrl], transcript, lang });
  console.error("Estimating... (validating spec)");
  console.log(JSON.stringify(spec, null, 2));
  console.error(`done in ${Date.now() - t0}ms (model ${Date.now() - t1}ms)`);
}

main().catch((e) => {
  console.error("scan failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
