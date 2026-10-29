import { describe, expect, it } from "vitest";
import { answerCopilot, watchHazards } from "../src/copilot.js";
import { mockScanSpec } from "../src/muse.js";

describe("S8 answerCopilot (mock, no key)", () => {
  it("grounds the answer in the spec and cites a step", async () => {
    const { answer, mock } = await answerCopilot({ question: "How do I replace the P-trap?", spec: mockScanSpec() });
    expect(mock).toBe(true);
    expect(answer.answer).toContain("P-trap");
    expect(answer.relates_to_step).toContain("P-trap");
  });

  it("answers in Spanish when the question is Spanish", async () => {
    const { answer } = await answerCopilot({ question: "¿Cómo reemplazo la trampa del fregadero?", spec: mockScanSpec() });
    expect(answer.answer).toMatch(/Según la cotización/);
  });

  it("falls back to the first step for an unrelated question", async () => {
    const { answer } = await answerCopilot({ question: "What time is it?", spec: mockScanSpec() });
    expect(answer.relates_to_step).toBe(mockScanSpec().steps[0]);
  });
});

describe("S8 watchHazards (mock, no key)", () => {
  it("reports safe when nothing suspicious is described", async () => {
    const { watch, mock } = await watchHazards({ spec: mockScanSpec(), frameNote: "dry cabinet, new trap fitted" });
    expect(mock).toBe(true);
    expect(watch.safe).toBe(true);
    expect(watch.warning).toBeNull();
  });

  it("flags exposed wiring as an advisory warning", async () => {
    const { watch } = await watchHazards({ spec: mockScanSpec(), frameNote: "exposed wiring behind the cabinet" });
    expect(watch.safe).toBe(false);
    expect(watch.warning).toMatch(/Advisory/);
    expect(watch.hazards.length).toBeGreaterThan(0);
  });

  it("warns in Spanish for Spanish frame notes", async () => {
    const { watch } = await watchHazards({ spec: mockScanSpec(), frameNote: "hay cable pelado junto al tubo" });
    expect(watch.safe).toBe(false);
    expect(watch.warning).toMatch(/Aviso/);
  });
});
