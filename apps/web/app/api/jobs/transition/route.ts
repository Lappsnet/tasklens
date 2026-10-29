import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { TRANSITIONS, getEvents, transitionJob } from "@/lib/jobs";

export const runtime = "nodejs";

const Body = z.object({
  jobId: z.string().min(1).max(100),
  to: z.enum(["en_route", "in_progress", "pending_verify"]),
});

/** Advance a job through the Day 4 state machine. Illegal jumps → 409. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`transition:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  // Pro (or admin) only: customers never move jobs.
  const gate = await requireRole(req, ["pro", "admin"]);
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
    const job = await transitionJob(parsed.data.jobId, parsed.data.to);
    if (!job) {
      const valid = Object.entries(TRANSITIONS)
        .flatMap(([from, tos]) => tos.map((t) => `${from}→${t}`))
        .join(", ");
      return NextResponse.json({ error: "invalid_transition", valid }, { status: 409 });
    }
    return NextResponse.json({ job, events: await getEvents(job.id) });
  } catch (e) {
    console.error("[api/jobs/transition] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "transition_failed" }, { status: 500 });
  }
}
