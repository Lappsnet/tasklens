import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { briefDay, type DayJob } from "@tasklens/ai";
import { getScanSpec } from "@/lib/scans";
import { listJobs, visibleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/** S2: pro day plan — jobs for a date + materials + spoken briefing. */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  const date = new URL(req.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  try {
    const jobs = visibleJobs(await listJobs(), gate.session).filter(
      (j) => j.slot?.startsWith(date) && ["booked", "en_route", "in_progress", "pending_verify"].includes(j.status),
    );
    const dayJobs: DayJob[] = [];
    for (const j of jobs) {
      const spec = await getScanSpec(j.scan_id).catch(() => null);
      dayJobs.push({
        jobId: j.id,
        slot: j.slot ?? "",
        title: spec?.title ?? "TaskLens job",
        materials: spec?.materials ?? [],
      });
    }
    dayJobs.sort((a, b) => a.slot.localeCompare(b.slot));
    const briefing = await briefDay({ date, jobs: dayJobs, proName: "Pro" });
    return NextResponse.json({ date, jobs: dayJobs, briefing: briefing.text, mock: briefing.mock });
  } catch (e) {
    console.error("[calendar/dayplan] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "dayplan_failed" }, { status: 500 });
  }
}
