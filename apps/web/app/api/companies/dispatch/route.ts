import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { canDispatch, listMembers } from "@/lib/companies";
import { assignJob, getBooking } from "@/lib/jobs";

export const runtime = "nodejs";

const Body = z.object({
  jobId: z.string().min(1).max(100),
  companyId: z.string().min(1).max(100),
  proId: z.string().min(1).max(100),
});

/**
 * U4 dispatch: assign a job to a member pro. Only the company's owners /
 * dispatchers (or admin). The job log records the dispatch.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`dispatch:${clientKey(req)}`, 20))) {
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
  const booking = await getBooking(parsed.data.jobId);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["quoted", "booked"].includes(booking.status)) {
    return NextResponse.json({ error: "not_dispatchable", status: booking.status }, { status: 409 });
  }
  if (!(await canDispatch(gate.session.userId, gate.session.role === "admin", parsed.data.companyId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const team = await listMembers(parsed.data.companyId);
  if (!team.some((m) => m.proId === parsed.data.proId)) {
    return NextResponse.json({ error: "not_a_member" }, { status: 409 });
  }
  const ok = await assignJob(parsed.data.jobId, parsed.data.proId, parsed.data.companyId);
  if (!ok) return NextResponse.json({ error: "dispatch_failed" }, { status: 500 });
  return NextResponse.json({ jobId: parsed.data.jobId, proId: parsed.data.proId, companyId: parsed.data.companyId });
}
