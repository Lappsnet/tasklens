import { describe, expect, it } from "vitest";
import { getSession, requireRole } from "../lib/auth";
import { visibleJobs } from "../lib/jobs";

function reqWithCookie(role?: string): Request {
  const headers: Record<string, string> = {};
  if (role) headers.cookie = `tasklens_demo=${role}`;
  return new Request("http://x/", { headers });
}

describe("demo sessions (no Supabase configured)", () => {
  it("defaults to an anonymous customer", async () => {
    const s = await getSession(reqWithCookie());
    expect(s).toMatchObject({ role: "customer", demo: true });
  });

  it("honors the demo role cookie", async () => {
    expect((await getSession(reqWithCookie("pro")))?.role).toBe("pro");
    expect((await getSession(reqWithCookie("admin")))?.role).toBe("admin");
  });

  it("ignores a forged/unknown role", async () => {
    expect((await getSession(reqWithCookie("owner")))?.role).toBe("customer");
  });
});

describe("requireRole", () => {
  it("passes allowed roles", async () => {
    const r = await requireRole(reqWithCookie("pro"), ["pro", "admin"]);
    expect("session" in r).toBe(true);
  });

  it("returns 403 for the wrong role", async () => {
    const r = await requireRole(reqWithCookie("customer"), ["pro"]);
    expect("response" in r).toBe(true);
    if ("response" in r) expect(r.response.status).toBe(403);
  });
});

describe("visibleJobs ownership filter", () => {
  const jobs = [
    { customer_id: "u1" },
    { customer_id: "u2" },
    {},
  ];
  it("demo mode returns everything", () => {
    expect(visibleJobs(jobs, { role: "customer", userId: "u1", demo: true })).toHaveLength(3);
  });

  it("real-mode customers see only their own jobs", () => {
    const out = visibleJobs(jobs, { role: "customer", userId: "u1", demo: false });
    expect(out).toHaveLength(2); // own + legacy unowned
    expect(out.every((j) => !j.customer_id || j.customer_id === "u1")).toBe(true);
  });

  it("real-mode pros/admins are not filtered server-side (RLS enforces rows)", () => {
    expect(visibleJobs(jobs, { role: "pro", userId: "p", demo: false })).toHaveLength(3);
  });
});
