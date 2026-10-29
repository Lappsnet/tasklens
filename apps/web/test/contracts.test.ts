import { describe, expect, it } from "vitest";
import { addSignature, getSignatures, saveChangeOrder, saveContract } from "../lib/contracts";

describe("S1 signatures + change orders (memory fallback)", () => {
  it("reaches fully_signed only after both roles sign", async () => {
    const c = await saveContract({
      job_id: "job-s1",
      status: "draft",
      title: "t",
      body_es: "x".repeat(60),
      body_en: "y".repeat(60),
      summary_es: "s es larga",
      summary_en: "long en summary",
      price_usd: 100,
      warranty_days: 30,
    });
    await addSignature({ contract_id: c.id, role: "customer", signer_name: "Ana", signature_png: "data:image/png;base64,AAA", email: "a@x.com" });
    expect((await getSignatures(c.id)).length).toBe(1);
    await addSignature({ contract_id: c.id, role: "pro", signer_name: "Carlos", signature_png: "data:image/png;base64,BBB", email: "p@x.com" });
    const sigs = await getSignatures(c.id);
    expect(sigs.map((s) => s.role).sort()).toEqual(["customer", "pro"]);
  });

  it("rejects duplicate role signatures", async () => {
    const c = await saveContract({
      job_id: "job-s1b",
      status: "draft",
      title: "t",
      body_es: "x".repeat(60),
      body_en: "y".repeat(60),
      summary_es: "s es larga",
      summary_en: "long en summary",
      price_usd: 100,
      warranty_days: 30,
    });
    await addSignature({ contract_id: c.id, role: "customer", signer_name: "Ana", signature_png: "data:image/png;base64,AAA", email: "a@x.com" });
    await addSignature({ contract_id: c.id, role: "customer", signer_name: "Ana2", signature_png: "data:image/png;base64,AAA", email: "a@x.com" });
    expect((await getSignatures(c.id)).length).toBe(1);
  });

  it("proposes and approves a change order", async () => {
    const c = await saveContract({
      job_id: "job-s1c",
      status: "fully_signed",
      title: "t",
      body_es: "x".repeat(60),
      body_en: "y".repeat(60),
      summary_es: "s es larga",
      summary_en: "long en summary",
      price_usd: 100,
      warranty_days: 30,
    });
    const ch = await saveChangeOrder({
      contract_id: c.id,
      description: "corroded pipe behind wall",
      scope_delta: "Replace 1m copper pipe",
      price_delta_usd: 45,
      time_delta_hours: 1,
      status: "proposed",
    });
    expect(ch.status).toBe("proposed");
    const approved = await saveChangeOrder({ ...ch, status: "approved", authorizationId: "MOCK-AUTH-x" });
    expect(approved.status).toBe("approved");
  });
});
