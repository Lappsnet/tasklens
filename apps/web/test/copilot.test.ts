import { describe, expect, it } from "vitest";
import { mockScanSpec } from "@tasklens/ai";
import { saveMemoryScan } from "../lib/scans";
import { getEvents, persistBooking } from "../lib/jobs";
import { POST as ask } from "../app/api/copilot/ask/route";
import { POST as hazard } from "../app/api/copilot/hazard/route";
import { POST as evidence } from "../app/api/copilot/evidence/route";

const PRO = { cookie: "tasklens_demo=pro" };
const CUSTOMER = { cookie: "tasklens_demo=customer" };

function req(url: string, body: unknown, role: { cookie: string }) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: role.cookie },
    body: JSON.stringify(body),
  });
}

async function seedJob() {
  const scan = saveMemoryScan({ spec: mockScanSpec(), transcript: "leak", lang: "en", photoCount: 1 });
  const { jobId } = await persistBooking({
    scan_id: scan.scanId,
    pro_id: "mock-carlos",
    price_usd: 170,
    slot: "2026-10-30T09:00",
    stripe_pi_id: "pi_mock_copilot",
  });
  return jobId;
}

describe("S8 copilot routes", () => {
  it("ask rejects customers (pro/admin only)", async () => {
    const res = await ask(req("http://x/api/copilot/ask", { jobId: "nope", question: "hi" }, CUSTOMER));
    expect(res.status).toBe(403);
  });

  it("ask answers from the spec and logs copilot_qa", async () => {
    const jobId = await seedJob();
    const res = await ask(req("http://x/api/copilot/ask", { jobId, question: "How do I replace the P-trap?", lang: "en" }, PRO));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { answer: { answer: string }; mock: boolean };
    expect(json.answer.answer).toContain("P-trap");
    expect(json.mock).toBe(true);
    const kinds = (await getEvents(jobId)).map((e) => e.kind);
    expect(kinds).toContain("copilot_qa");
  });

  it("ask 404s on unknown job and 400s on empty question", async () => {
    expect((await ask(req("http://x/api/copilot/ask", { jobId: "missing", question: "hi" }, PRO))).status).toBe(404);
    const jobId = await seedJob();
    expect((await ask(req("http://x/api/copilot/ask", { jobId, question: "" }, PRO))).status).toBe(400);
  });

  it("hazard stays silent when safe, logs + warns on exposed wiring", async () => {
    const jobId = await seedJob();
    const calm = (await (
      await hazard(req("http://x/api/copilot/hazard", { jobId, frameNote: "dry cabinet, new trap fitted" }, PRO))
    ).json()) as { safe: boolean; event: unknown };
    expect(calm.safe).toBe(true);
    expect(calm.event).toBeNull();
    const hot = (await (
      await hazard(req("http://x/api/copilot/hazard", { jobId, frameNote: "exposed wiring behind the cabinet" }, PRO))
    ).json()) as { safe: boolean; warning: string; event: { id: string } };
    expect(hot.safe).toBe(false);
    expect(hot.warning).toMatch(/Advisory/);
    expect(hot.event.id).toBeTruthy();
    const kinds = (await getEvents(jobId)).map((e) => e.kind);
    expect(kinds).toContain("hazard");
  });

  it("evidence saves the frame and ticks the step done", async () => {
    const jobId = await seedJob();
    const fd = new FormData();
    fd.append("jobId", jobId);
    fd.append("step", mockScanSpec().steps[0]);
    fd.append("photo", new File([new Uint8Array([1, 2, 3])], "frame.jpg", { type: "image/jpeg" }));
    const res = await evidence(
      new Request("http://x/api/copilot/evidence", { method: "POST", headers: PRO, body: fd }),
    );
    expect(res.status).toBe(200);
    const kinds = (await getEvents(jobId)).map((e) => e.kind);
    expect(kinds).toContain("step_evidence");
    expect(kinds).toContain("step");
  });

  it("evidence rejects missing/oversize photos", async () => {
    const jobId = await seedJob();
    const empty = new FormData();
    empty.append("jobId", jobId);
    empty.append("step", "Replace P-trap");
    expect((await evidence(new Request("http://x/api/copilot/evidence", { method: "POST", headers: PRO, body: empty }))).status).toBe(400);
    const big = new FormData();
    big.append("jobId", jobId);
    big.append("step", "Replace P-trap");
    big.append("photo", new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" }));
    expect((await evidence(new Request("http://x/api/copilot/evidence", { method: "POST", headers: PRO, body: big }))).status).toBe(413);
  });
});
