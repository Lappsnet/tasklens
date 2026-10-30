import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { addMember, canDispatch, listMembers } from "@/lib/companies";

export const runtime = "nodejs";

const Query = z.object({ companyId: z.string().min(1).max(100) });
const Body = z.object({
  companyId: z.string().min(1).max(100),
  proId: z.string().min(1).max(100),
  role: z.enum(["owner", "dispatcher", "member"]).default("member"),
});

/** U4 team roster: dispatchers/owners manage members (admin bypasses). */
export async function GET(req: Request) {
  if (!(await hitRateLimit(`teammates:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "company", "admin"]);
  if ("response" in gate) return gate.response;
  const parsed = Query.safeParse({ companyId: new URL(req.url).searchParams.get("companyId") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!(await canDispatch(gate.session.userId, gate.session.role === "admin", parsed.data.companyId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ members: await listMembers(parsed.data.companyId) });
}

export async function POST(req: Request) {
  if (!(await hitRateLimit(`teammates:${clientKey(req)}`, 20))) {
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
  if (!(await canDispatch(gate.session.userId, gate.session.role === "admin", parsed.data.companyId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const member = await addMember(parsed.data.companyId, parsed.data.proId.trim(), parsed.data.role);
  if (!member) return NextResponse.json({ error: "pro_not_found" }, { status: 404 });
  return NextResponse.json({ member });
}
