import { describe, expect, it } from "vitest";
import { landingContent } from "../content/landing.es";
import { landingEn } from "../content/landing.en";

describe("U5 landing content", () => {
  it("ES and EN share the same shape", () => {
    const es = landingContent("es");
    const en = landingContent("en");
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(es.chapters.map((c) => c.slug)).toEqual(en.chapters.map((c) => c.slug));
    expect(es.chapters.length).toBeGreaterThanOrEqual(11);
    expect(es.faqs.length).toBe(8);
    expect(en.faqs.length).toBe(8);
    expect(es.tabs.length).toBe(3);
  });

  it("feature chapters are concrete (3 steps, tech + who chips)", () => {
    for (const c of landingContent("es").chapters) {
      expect(c.how.length).toBe(3);
      expect(c.tech.length).toBeGreaterThan(0);
      expect(c.who.length).toBeGreaterThan(0);
      expect(c.promise.length).toBeGreaterThan(10);
    }
  });

  it("demo video config is overrideable and defaults to empty", () => {
    expect(landingContent("es").demoVideo.provider).toBeNull();
    expect(landingEn.demoVideo.poster).toBeTruthy();
    expect(landingEn.demoVideo.chapters.length).toBe(4);
  });
});
