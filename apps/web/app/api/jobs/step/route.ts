import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";

export const runtime = "nodejs";

const Body = z.object({
  jobId: z.string().min(1).max(100),
  step: z.string().min(1).max(500),
  done: z.boolean(),
});

/** Hands-free checklist ticks: step done/undone appended to the job log. */
export async function POST(req: Request) {
  if (!rateLimit(`step:${clientKey(req)}`, 60)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
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
  if (!(await getBooking(parsed.data.jobId))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const ev = await appendEvent(parsed.data.jobId, "step", { step: parsed.data.step, done: parsed.data.done });
    return NextResponse.json({ event: ev });
  } catch (e) {
    console.error("[api/jobs/step] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "step_failed" }, { status: 500 });
  }
}
