import { describe, expect, it } from "vitest";
import { triageReport } from "../src/city.js";

describe("S7 triageReport (mock)", () => {
  it("triages a street-light outage as electrical", async () => {
    const { triage, mock } = await triageReport({
      description: "El poste de luz de la esquina lleva una semana apagado, la calle queda a oscuras",
      city: "San Salvador",
    });
    expect(mock).toBe(true);
    expect(triage.category).toBe("street_light");
    expect(triage.suggested_trade).toBe("electrical");
    expect(triage.person_subject).toBe(false);
  });

  it("escalates gas/danger words to urgent with a 4h SLA", async () => {
    const { triage } = await triageReport({
      description: "Fuerte olor a gas cerca del tragante, peligro para los vecinos",
      city: "Santa Tecla",
    });
    expect(triage.severity).toBe("urgent");
    expect(triage.sla_hours).toBe(4);
  });
});
