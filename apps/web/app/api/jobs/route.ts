import { NextResponse } from "next/server";
import { getBooking, getEvents, listJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/** GET /api/jobs?id=... → job + payment + event log. ?status=booked → list. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  if (id) {
    const job = await getBooking(id);
    if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ job, events: await getEvents(id) });
  }
  const jobs = await listJobs(status ?? undefined);
  return NextResponse.json({ jobs });
}
