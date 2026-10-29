import { describe, expect, it } from "vitest";
import { __clearApplications } from "../lib/applications";
import { __clearApprovedPros, searchPros } from "../lib/pros";
import { POST as apply } from "../app/api/pros/apply/route";
import { GET as queue } from "../app/api/pros/applications/route";
import { POST as decide } from "../app/api/pros/decide/route";

const ADMIN = { cookie: "tasklens_demo=admin" };
const CUSTOMER = { cookie: "tasklens_demo=customer" };

function applyForm(over: Record<string, string> = {}, withPhoto = true, headers: Record<string, string> = ADMIN) {
  const fd = new FormData();
  fd.append("name", over.name ?? "Juan Pérez");
  fd.append("category", over.category ?? "plumbing");
  fd.append("zone", over.zone ?? "Soyapango, SV");
  fd.append("phone", over.phone ?? "+503 7000 0001");
  fd.append("rate_usd_hr", over.rate ?? "35");
  if (withPhoto) fd.append("idPhoto", new File([new Uint8Array([1, 2, 3])], "id.jpg", { type: "image/jpeg" }));
  return new Request("http://x/api/pros/apply", { method: "POST", headers, body: fd, duplex: "half" } as RequestInit);
}

function json(url: string, body: unknown) {
  return new Request(url, { method: "POST", headers: { ...ADMIN, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("P1 pro onboarding + admin queue", () => {
  it("accepts a public application without a session", async () => {
    __clearApplications();
    const res = await apply(applyForm({}, true, {}));
    // no cookie at all -> still accepted (public form)
    expect(res.status).toBe(200);
    const j = (await res.json()) as { id: string; status: string };
    expect(j.status).toBe("pending");
  });

  it("requires an ID photo and valid fields", async () => {
    __clearApplications();
    const noPhoto = applyForm({}, false);
    expect((await apply(noPhoto)).status).toBe(400);
    const badCat = applyForm({ category: "rocket" });
    expect((await apply(badCat)).status).toBe(400);
  });

  it("admin queue is admin-only; approve creates a searchable pro", async () => {
    __clearApplications();
    __clearApprovedPros();
    const got = await queue(new Request("http://x/api/pros/applications?status=pending", { headers: CUSTOMER }));
    expect(got.status).toBe(403);

    const created = (await (await apply(applyForm())).json()) as { id: string };
    const q = (await (await queue(new Request("http://x/api/pros/applications?status=pending", { headers: ADMIN }))).json()) as {
      applications: { id: string; idPhotoUrl: string | null }[];
    };
    expect(q.applications.some((a) => a.id === created.id)).toBe(true);

    const dec = await decide(json("http://x/api/pros/decide", { id: created.id, approve: true }));
    expect(dec.status).toBe(200);
    const pros = await searchPros({ category: "plumbing", lat: 13.6929, lng: -89.2182, max_km: 40 });
    expect(pros.some((p) => p.name === "Juan Pérez")).toBe(true);

    // double decision is rejected
    expect((await decide(json("http://x/api/pros/decide", { id: created.id, approve: true }))).status).toBe(409);
  });

  it("reject requires a reason", async () => {
    __clearApplications();
    const created = (await (await apply(applyForm({ name: "Ana López" }))).json()) as { id: string };
    expect((await decide(json("http://x/api/pros/decide", { id: created.id, approve: false }))).status).toBe(400);
    const ok = await decide(json("http://x/api/pros/decide", { id: created.id, approve: false, reason: "ID ilegible" }));
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { status: string }).status).toBe("rejected");
  });
});
