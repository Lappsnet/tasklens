import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getBooking, getEvents, listJobs, visibleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/** GET /api/jobs?id=... → job + event log. ?status=booked → list (ownership-filtered). */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin", "company"]);
  if ("response" in gate) return gate.response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  if (id) {
    const job = await getBooking(id);
    if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (gate.session.role === "company") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (visibleJobs([job], gate.session).length === 0) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ job, events: await getEvents(id) });
  }
  let jobs = visibleJobs(await listJobs(status ?? undefined), gate.session);
  // Least privilege: companies see only the claimable dispatch pool
  // (unassigned quoted/booked), never customer details beyond the spec.
  if (gate.session.role === "company") {
    jobs = jobs.filter((j) => !j.company_id && ["quoted", "booked"].includes(j.status));
  }
  return NextResponse.json({ jobs });
}
