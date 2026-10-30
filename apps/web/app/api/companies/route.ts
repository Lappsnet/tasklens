import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { createCompany, myCompanies } from "@/lib/companies";

export const runtime = "nodejs";

const Body = z.object({ name: z.string().min(2).max(120), zone: z.string().max(120).default("") });

/** U4 Empresa: list my companies / create one (pro, company, admin). */
export async function GET(req: Request) {
  if (!(await hitRateLimit(`companies:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "company", "admin"]);
  if ("response" in gate) return gate.response;
  try {
    const mine = await myCompanies(gate.session.userId);
    return NextResponse.json({ companies: mine.map((m) => ({ ...m.company, role: m.role, proId: m.proId })) });
  } catch (e) {
    console.error("[api/companies] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "companies_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await hitRateLimit(`companies:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "company", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const company = await createCompany(gate.session.userId, parsed.data.name.trim(), parsed.data.zone.trim());
    return NextResponse.json({ company });
  } catch (e) {
    console.error("[api/companies] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "companies_failed" }, { status: 500 });
  }
}
