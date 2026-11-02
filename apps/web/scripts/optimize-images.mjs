#!/usr/bin/env node
/* V2.1: real-photo pipeline. Owner drops originals into
 * apps/web/public/images/jobs/ (any .jpg/.jpeg/.png names).
 * This script (needs `sharp`: `pnpm --filter web add -D sharp`):
 * - strips EXIF/GPS (never call withMetadata),
 * - writes AVIF + WebP at 640 / 1280 / 1920 px to public/images/jobs/opt/,
 * - writes a tiny blurred placeholder (blurDataURL) per photo,
 * - prints the per-photo questionnaire the owner must answer before any
 *   photo is used (job, status, municipality, before/after pair, source).
 * Run: pnpm --filter web images
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../public/images/jobs/", import.meta.url));
const outDir = path.join(dir, "opt");
const MANIFEST = path.join(outDir, "manifest.json");

const WIDTHS = [640, 1280, 1920];

async function main() {
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith("."))
    : [];
  if (files.length === 0) {
    console.log("No photos in apps/web/public/images/jobs/ yet.");
    console.log("Drop originals there (any names), then re-run: pnpm --filter web images");
    return;
  }
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("sharp is not installed. Run: pnpm --filter web add -D sharp");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {};
  for (const f of files) {
    const src = path.join(dir, f);
    const base = f.replace(/\.[^.]+$/, "");
    const meta = await sharp(src).metadata();
    for (const w of WIDTHS) {
      if (meta.width && meta.width < w) continue;
      for (const fmt of ["avif", "webp"]) {
        const out = path.join(outDir, `${base}-${w}.${fmt}`);
        if (fs.existsSync(out)) continue;
        await sharp(src).resize({ width: w, withoutEnlargement: true })[fmt]({ quality: fmt === "avif" ? 55 : 78 }).toFile(out);
        console.log("wrote", path.basename(out));
      }
    }
    const blur = await sharp(src).resize({ width: 20 }).jpeg({ quality: 40 }).toBuffer();
    manifest[f] = {
      width: meta.width ?? null,
      height: meta.height ?? null,
      blurDataURL: `data:image/jpeg;base64,${blur.toString("base64")}`,
      variants: WIDTHS.filter((w) => !meta.width || meta.width >= w),
    };
    console.log(`\n--- answer before using ${f} ---`);
    console.log("1. What job does it show? 2. Status (reported/in_progress/done)?");
    console.log("3. Municipality only (never address)? 4. Before/after pairId?");
    console.log("5. Source (own photo / permission / licensed + name)? Faces/plates/house numbers visible?");
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nmanifest: public/images/jobs/opt/manifest.json (${Object.keys(manifest).length} photos)`);
}

main().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
