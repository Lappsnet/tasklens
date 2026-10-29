import { describe, expect, it } from "vitest";
import { acceptProposal, listDisputes, listProposals, openDispute, saveProposal } from "../lib/funding";
import { createFundingLink, markFundingUsed, resolveFunding } from "../lib/funding";

describe("S5 funding links (hash-only tokens)", () => {
  it("creates, resolves and consumes a link", async () => {
    const link = await createFundingLink("job-f1");
    expect(link.token.length).toBe(64);
    const found = await resolveFunding(link.token);
    expect(found?.job_id).toBe("job-f1");
    await markFundingUsed(found!.id, "tia@example.com");
    expect(await resolveFunding(link.token)).toBeNull();
  });

  it("rejects unknown tokens", async () => {
    expect(await resolveFunding("00".repeat(32))).toBeNull();
  });
});

describe("S6 disputes (AI proposes, humans dispose)", () => {
  it("opens, proposes and accepts", async () => {
    const d = await openDispute("job-d1", "customer", "still leaking a bit");
    expect((await listDisputes("job-d1")).some((x) => x.id === d.id)).toBe(true);
    const p = await saveProposal({ dispute_id: d.id, kind: "redo", detail: "Redo trap", amount_usd: null, created_by: "ai" });
    expect((await listProposals(d.id)).some((x) => x.id === p.id)).toBe(true);
    expect(await acceptProposal(d.id, p.id, "pro")).toBe(true);
    expect(await acceptProposal(d.id, p.id, "pro")).toBe(false); // no double-accept
  });
});
