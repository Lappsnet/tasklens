import { describe, expect, it } from "vitest";
import { makeContractPdf } from "../lib/pdf";

describe("S1 hand-rolled PDF (dependency-free)", () => {
  const pdf = () =>
    makeContractPdf({
      title: "Leaking P-trap — Ana / Carlos",
      body: "Linea 1\nLinea 2 con acentos: reparación, cañería y más.",
      signatures: [{ role: "customer", signerName: "Ana", email: "a@x.com", signedAt: 1700000000000 }],
      footer: "Plantilla generada con IA.",
    });

  it("starts with a PDF header and ends with EOF", () => {
    const b = Buffer.from(pdf());
    expect(b.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(b.subarray(-5).toString()).toBe("%%EOF");
  });

  it("embeds the title and is deterministic", () => {
    const a = Buffer.from(pdf()).toString("latin1");
    expect(a).toContain("Leaking P-trap");
    expect(a).toContain("Ana");
    expect(Buffer.from(pdf()).equals(Buffer.from(pdf()))).toBe(true);
  });

  it("paginates long bodies", () => {
    const long = makeContractPdf({
      title: "T",
      body: Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n"),
      signatures: [],
      footer: "F",
    });
    const text = Buffer.from(long).toString("latin1");
    const pages = (text.match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(4);
  });
});
