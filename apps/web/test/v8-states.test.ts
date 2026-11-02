import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

/* V8: every list/dashboard has loading, empty and error states.
   Empty states carry an illustration + action; error states retry. */
describe("V8 empty, loading and error states", () => {
  it("EmptyState renders a blueprint mark by default and supports a real photo", () => {
    const ui = readFileSync(join(ROOT, "components/ui.tsx"), "utf8");
    expect(ui).toContain("border-signal rounded-tl");
    expect(ui).toContain("aspect-[16/9]");
  });

  it("every ErrorState in the app offers a retry", () => {
    const bad: string[] = [];
    for (const f of walk(join(ROOT, "app"))) {
      const src = readFileSync(f, "utf8");
      const uses = src.match(/<ErrorState[\s\S]*?\/>/g) ?? [];
      for (const u of uses) {
        if (!u.includes("onRetry")) bad.push(`${f}: ${u.slice(0, 60)}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("no hidden placeholder skeletons", () => {
    const bad: string[] = [];
    for (const f of walk(join(ROOT, "app"))) {
      if (/Skeleton[^>]*hidden/.test(readFileSync(f, "utf8"))) bad.push(f);
    }
    expect(bad).toEqual([]);
  });

  it("V8 empty-state photos exist on disk", () => {
    for (const img of [
      "public/images/showcase/cambio-de-chapa.webp",
      "public/images/showcase/ducha-electrica-cambio-resistencia.webp",
      "public/images/showcase/grifo-cocina-danado.webp",
    ]) {
      expect(existsSync(join(ROOT, img)), img).toBe(true);
    }
  });
});
