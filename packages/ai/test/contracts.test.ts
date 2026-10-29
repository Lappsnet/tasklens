import { describe, expect, it } from "vitest";
import { ContractDraft, clauseNames, mockContractDraft } from "../src/contracts.js";
import { mockScanSpec } from "../src/muse.js";

const input = {
  spec: mockScanSpec(),
  jobId: "job-s1",
  proName: "Carlos Mendez",
  customerName: "Ana",
  slot: "2026-10-30T09:00",
  priceUsd: 170,
};

describe("S1 clause library", () => {
  it("loads the fixed clause files", () => {
    const names = clauseNames();
    expect(names.length).toBeGreaterThanOrEqual(8);
    expect(names.some((n) => n.includes("warranty"))).toBe(true);
    expect(names.some((n) => n.includes("dispute"))).toBe(true);
  });
});

describe("mockContractDraft", () => {
  it("validates against the ContractDraft contract", () => {
    expect(ContractDraft.safeParse(mockContractDraft(input)).success).toBe(true);
  });

  it("is bilingual with a 5-line summary and the legal footer", () => {
    const d = mockContractDraft(input);
    expect(d.summary_es.split("\n")).toHaveLength(5);
    expect(d.summary_en.split("\n")).toHaveLength(5);
    expect(d.body_es).toContain("no constituye asesoría legal");
    expect(d.body_en).toContain("not legal advice");
  });

  it("fills job facts into the scope (no invented clauses)", () => {
    const d = mockContractDraft(input);
    expect(d.body_en).toContain("Shut off water");
    expect(d.body_en).toContain("170");
    expect(d.body_en).toContain("Carlos Mendez");
  });
});
