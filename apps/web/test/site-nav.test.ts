import { describe, expect, it } from "vitest";
import { featureLinks, roleHome, roleLabel, roleLinks } from "../components/site/nav";

const LIVE = new Set([
  "/scan", "/pro", "/pro/calendar", "/pro/apply", "/passport", "/projects/new",
  "/city", "/admin", "/admin/pros", "/", "/login",
]);

describe("U2 site nav config", () => {
  it("mega-menu features all link to live routes or landing anchors", () => {
    for (const lang of ["es", "en"] as const) {
      const feats = featureLinks(lang);
      expect(feats.length).toBeGreaterThanOrEqual(11);
      for (const f of feats) {
        const path = f.href.split("#")[0] || "/";
        expect(LIVE.has(path), `${f.slug} -> ${f.href}`).toBe(true);
        expect(f.name.length).toBeGreaterThan(0);
        expect(f.desc.length).toBeGreaterThan(0);
      }
    }
  });

  it("feature names are translated, not duplicated across languages", () => {
    const es = featureLinks("es").map((f) => f.name).join("|");
    const en = featureLinks("en").map((f) => f.name).join("|");
    expect(es).not.toBe(en);
  });

  it("role homes route each role to a live page", () => {
    expect(roleHome("customer")).toBe("/");
    expect(roleHome("pro")).toBe("/pro");
    expect(roleHome("company")).toBe("/pro");
    expect(roleHome("city_operator")).toBe("/city");
    expect(roleHome("admin")).toBe("/admin");
    for (const r of ["customer", "pro", "company", "city_operator", "admin"]) {
      expect(LIVE.has(roleHome(r))).toBe(true);
      const links = roleLinks(r, "es");
      expect(links.length).toBeGreaterThan(0);
      for (const l of links) expect(LIVE.has(l.href), `${r} -> ${l.href}`).toBe(true);
    }
  });

  it("role labels are localized", () => {
    expect(roleLabel("city_operator", "es")).toBe("Alcaldía");
    expect(roleLabel("city_operator", "en")).toBe("Municipality");
    expect(roleLabel("company", "es")).toBe("Empresa");
  });
});
