import { describe, expect, it } from "vitest";
import { roleMenu } from "../components/site/nav";
import { __clearCompanies, addMember, canDispatch, createCompany } from "../lib/companies";
import { persistBooking } from "../lib/jobs";
import { POST as dispatch } from "../app/api/companies/dispatch/route";

const ADMIN = { cookie: "tasklens_demo=admin" };
const PRO = { cookie: "tasklens_demo=pro" };

const LIVE = new Set([
  "/", "/scan", "/quote", "/book", "/jobs", "/pro", "/pro/calendar", "/pro/jobs",
  "/contracts", "/passport", "/projects/new", "/fund", "/city", "/admin", "/admin/pros",
  "/login", "/signup", "/pro/apply", "/inicio", "/ajustes", "/empresa", "/empresa/equipo", "/connect-glasses",
]);

function live(href: string): boolean {
  const path = href.split("?")[0].split("#")[0] || "/";
  if (LIVE.has(path)) return true;
  return ["/scan", "/quote", "/book", "/jobs", "/pro/jobs", "/contracts", "/projects", "/fund"].some((p) => path === p || path.startsWith(p + "/"));
}

describe("U4 role menus", () => {
  it("every tab and center action links to a live route, mobile tabs fit the bar", () => {
    for (const role of ["customer", "pro", "company", "city_operator", "admin"]) {
      for (const lang of ["es", "en"] as const) {
        const menu = roleMenu(role, lang);
        expect(menu.tabs.length).toBeGreaterThan(0);
        for (const tab of menu.tabs) expect(live(tab.href), `${role} ${tab.href}`).toBe(true);
        if (menu.center) expect(live(menu.center.href), `${role} center`).toBe(true);
        expect(menu.tabs.filter((t) => t.mobile).length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("admin has a null center action (no FAB)", () => {
    expect(roleMenu("admin", "es").center).toBeNull();
    expect(roleMenu("customer", "es").center?.href).toBe("/scan");
  });
});

describe("U4 companies + dispatch", () => {
  it("create -> add member -> dispatch assigns the job and logs it", async () => {
    __clearCompanies();
    const company = await createCompany("demo-company", "Fix SV", "San Salvador");
    // non-member cannot dispatch
    expect(await canDispatch("demo-pro", false, company.id)).toBe(false);
    const member = await addMember(company.id, "mock-carlos", "member");
    expect(member?.proId).toBe("mock-carlos");
    expect(await canDispatch("demo-company", false, company.id)).toBe(true);

    const { jobId } = await persistBooking({ scan_id: "s", pro_id: "mock-rosa", price_usd: 100, slot: "t", stripe_pi_id: "pi_x" });
    const ok = await dispatch(
      new Request("http://x/api/companies/dispatch", {
        method: "POST",
        headers: { ...ADMIN, "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, companyId: company.id, proId: "mock-carlos" }),
      }),
    );
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { proId: string }).proId).toBe("mock-carlos");
  });

  it("dispatch rejects non-dispatchable jobs and strangers", async () => {
    __clearCompanies();
    const company = await createCompany("demo-company", "Fix SV", "San Salvador");
    const { jobId } = await persistBooking({ scan_id: "s", pro_id: "mock-rosa", price_usd: 100, slot: "t", stripe_pi_id: "pi_y" });
    const body = (extra: object) =>
      new Request("http://x/api/companies/dispatch", {
        method: "POST",
        headers: { ...PRO, "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, companyId: company.id, ...extra }),
      });
    // pro is not a dispatcher of this company
    expect((await dispatch(body({ proId: "mock-carlos" }))).status).toBe(403);
    // unknown pro can't be assigned even by admin
    const bad = await dispatch(
      new Request("http://x/api/companies/dispatch", {
        method: "POST",
        headers: { ...ADMIN, "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, companyId: company.id, proId: "ghost" }),
      }),
    );
    expect(bad.status).toBe(409);
  });
});
