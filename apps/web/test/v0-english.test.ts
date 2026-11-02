import { describe, expect, it } from "vitest";
import { landingContent } from "../content/landing.es";

/* V0.5: English mode must have no Spanish. Renders content-only (components
   take translated props); fails on the hardcoded words from the bug report. */
describe("V0 English has no Spanish", () => {
  it("en content contains none of the flagged Spanish words", () => {
    const en = landingContent("en");
    const blob = JSON.stringify(en);
    for (const w of ["Hoy", "día ", "minutos", "semanas", "VERIFICADO", "Probar", "ESCANEO", "PAGO", "CONTRATOS", "CALENDARIO", "Fontanería", "Sifón", "fuga activa", "BAÑO"]) {
      expect(blob, `EN contains Spanish: ${w}`).not.toContain(w);
    }
    expect(en.trades).toContain("Plumbing");
    expect(en.tryNow).toBe("Try now");
    expect(en.raceToday).toBe("Today");
    expect(en.raceSeal).toBe("Verified");
  });
});
