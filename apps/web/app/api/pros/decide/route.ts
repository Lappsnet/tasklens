import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { decideApplication } from "@/lib/applications";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().min(1).max(100),
  approve: z.boolean(),
  reason: z.string().max(500).optional(),
});

/** P1: admin approve/reject. Approve creates the pro so match/search sees them. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`decide:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!parsed.data.approve && !parsed.data.reason?.trim()) {
    return NextResponse.json({ error: "need_reason" }, { status: 400 });
  }

  try {
    const app = await decideApplication(
      parsed.data.id,
      parsed.data.approve,
      gate.session.demo ? "demo-admin" : gate.session.userId,
      parsed.data.reason?.trim(),
    );
    if (!app) return NextResponse.json({ error: "not_found_or_decided" }, { status: 409 });
    return NextResponse.json({ id: app.id, status: app.status });
  } catch (e) {
    console.error("[api/pros/decide] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "decide_failed" }, { status: 500 });
  }
}
