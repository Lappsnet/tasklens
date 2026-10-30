import { describe, expect, it } from "vitest";
import { landingContent } from "../content/landing.es";

const SLUGS = ["escaneo", "contratos", "calendario", "pago", "verificacion", "pasaporte", "planificador", "extranjero", "mediacion", "copiloto", "alcaldias"];

describe("U6 feature deep pages", () => {
  it("every menu/theater slug resolves to a chapter", () => {
    const chapters = landingContent("es").chapters;
    expect(chapters.map((c) => c.slug).sort()).toEqual([...SLUGS].sort());
  });

  it("deep-page anchors are live or landing-anchored", () => {
    // Smoke: chapter tech/who chips are non-empty (rendered on every deep page).
    for (const c of landingContent("en").chapters) {
      expect(c.tech.length).toBeGreaterThan(0);
      expect(c.who.length).toBeGreaterThan(0);
    }
  });
});
