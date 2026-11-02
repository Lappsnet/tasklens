import { describe, expect, it } from "vitest";
import { landingContent } from "../content/landing.es";
import { FUNCIONES, FUNCIONES_T } from "../content/funciones";
import { SHOWCASE_JOBS } from "../content/showcase";

/* V4: every feature chapter has a complete ES+EN page entry (hero, problem,
   3 FAQs per language, demo-labelled visual). EN must have no Spanish. */
const ES_WORDS = ["Hoy", "día ", "minutos", "semanas", "VERIFICADO", "Probar", "Sifón", "fuga activa", "BAÑO", "reparación", "verificación", "está", "están", "para", "Cómo", "Qué"];

describe("V4 feature page content", () => {
  const slugs = landingContent("es").chapters.map((c) => c.slug);

  it("covers every chapter slug in both languages", () => {
    expect(slugs.length).toBeGreaterThanOrEqual(11);
    for (const slug of slugs) {
      const f = FUNCIONES[slug];
      expect(f, `missing entry: ${slug}`).toBeDefined();
      expect(f.problem.es.length).toBeGreaterThan(10);
      expect(f.problem.en.length).toBeGreaterThan(10);
      expect(f.solution.es.length).toBeGreaterThan(10);
      expect(f.solution.en.length).toBeGreaterThan(10);
      expect(f.faqs.es.length).toBe(3);
      expect(f.faqs.en.length).toBe(3);
    }
  });

  it("EN strings contain no flagged Spanish words", () => {
    for (const slug of slugs) {
      const f = FUNCIONES[slug];
      const blob = JSON.stringify({ en: [f.problem.en, f.solution.en, f.cta.en, f.faqs.en] });
      for (const w of ES_WORDS) {
        expect(blob, `${slug} EN contains Spanish: ${w}`).not.toContain(w);
      }
    }
    expect(JSON.stringify(FUNCIONES_T.en)).not.toContain("Preguntas");
  });

  it("photo heroes reference real showcase jobs with images", () => {
    for (const slug of slugs) {
      const h = FUNCIONES[slug].hero;
      if (h.type !== "photo") continue;
      const job = SHOWCASE_JOBS.find((j) => j.id === h.jobId);
      expect(job, `${slug} photo job missing: ${h.jobId}`).toBeDefined();
      expect(job!.image.src).toMatch(/^\/images\/showcase\//);
      expect(h.annotations.en.length).toBeGreaterThan(0);
      expect(h.annotations.es.length).toBe(h.annotations.en.length);
    }
  });
});
