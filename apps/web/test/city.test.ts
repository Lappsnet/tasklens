import { describe, expect, it } from "vitest";
import { createReport, listReports, updateReport } from "../lib/city";
import { findCity, nearestCity } from "../lib/cities";
import type { CityTriage } from "@tasklens/ai";

const triage = (over: Partial<CityTriage> = {}): CityTriage => ({
  category: "water_leak",
  severity: "high",
  title_es: "Fuga en la calle",
  summary_es: "Agua saliendo del tragante.",
  person_subject: false,
  suggested_trade: "plumbing",
  sla_hours: 24,
  ...over,
});

describe("S7 city directory (all of LatAm, fenced by city)", () => {
  it("finds directory cities and rejects unknown slugs", () => {
    expect(findCity("san-salvador")?.country_code).toBe("SV");
    expect(findCity("bogota")?.country).toBe("Colombia");
    expect(findCity("nope")).toBeNull();
  });

  it("nearestCity resolves a point to its city", () => {
    expect(nearestCity(13.7, -89.22).slug).toBe("san-salvador");
    expect(nearestCity(4.71, -74.07).slug).toBe("bogota");
    expect(nearestCity(19.43, -99.13).slug).toBe("cdmx");
  });
});

describe("S7 reports (mock store)", () => {
  it("snaps coords, sets the SLA clock and clusters nearby duplicates", async () => {
    const a = await createReport({
      city_slug: "t-city-a", country_code: "SV", description: "Fuga grave frente al mercado",
      lat: 13.69291, lng: -89.21821, reporter_id: "u1", triage: triage(),
    });
    expect(a.lat).toBe(13.6929); // snapped to 4 decimals
    const slaH = (new Date(a.sla_due).getTime() - new Date(a.created_at).getTime()) / 3600_000;
    expect(Math.round(slaH)).toBe(24);
    const b = await createReport({
      city_slug: "t-city-a", country_code: "SV", description: "Otra fuga a media cuadra",
      lat: 13.693, lng: -89.2183, reporter_id: "u2", triage: triage(),
    });
    expect(b.cluster_id).toBe(a.cluster_id); // joined the open cluster
    const far = await createReport({
      city_slug: "t-city-a", country_code: "SV", description: "Fuga al otro lado de la ciudad",
      lat: 13.75, lng: -89.28, reporter_id: "u3", triage: triage(),
    });
    expect(far.cluster_id).not.toBe(a.cluster_id);
  });

  it("never stores person-subject reports", async () => {
    await expect(
      createReport({
        city_slug: "t-city-b", country_code: "SV", description: "Foto con gente",
        lat: 13.7, lng: -89.22, reporter_id: "u1",
        triage: triage({ person_subject: true }),
      }),
    ).rejects.toThrow("person_subject");
  });

  it("lists are city-fenced", async () => {
    await createReport({
      city_slug: "t-city-c", country_code: "GT", description: "Poste apagado en la zona 1",
      lat: 14.63, lng: -90.51, reporter_id: "u1",
      triage: triage({ category: "street_light", suggested_trade: "electrical" }),
    });
    const same = await listReports("t-city-c");
    const other = await listReports("t-city-a");
    expect(same.length).toBeGreaterThan(0);
    expect(other.some((r) => r.city_slug === "t-city-c")).toBe(false);
  });

  it("operators only touch their own city; bad transitions throw", async () => {
    const r = await createReport({
      city_slug: "t-city-d", country_code: "SV", description: "Acera rota frente a la escuela",
      lat: 13.7, lng: -89.22, reporter_id: "u1", triage: triage({ category: "sidewalk" }),
    });
    expect(await updateReport(r.id, { status: "assigned" }, "t-city-other")).toBeNull();
    await expect(updateReport(r.id, { status: "closed" }, "t-city-d")).rejects.toThrow("invalid_transition");
    const ok = await updateReport(r.id, { status: "assigned", assigned_pro_id: "mock-carlos" }, "t-city-d");
    expect(ok?.status).toBe("assigned");
    const admin = await updateReport(r.id, { status: "in_progress" }, null);
    expect(admin?.status).toBe("in_progress");
  });
});
