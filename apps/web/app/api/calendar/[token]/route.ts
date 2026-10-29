import { NextResponse } from "next/server";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { jobToIcs, mintFeedToken, resolveFeedToken, revokeFeedToken } from "@/lib/calendar";
import { listJobs, visibleJobs } from "@/lib/jobs";
import { getScanSpec } from "@/lib/scans";

export const runtime = "nodejs";

/** Mint a private ICS feed URL (shown once; only the hash is stored). */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`feed:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  const userId = gate.session.demo ? `demo-${gate.session.role}` : gate.session.userId;
  const { token, mock } = await mintFeedToken(userId);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({ url: `${base}/api/calendar/${token}.ics`, token, mock });
}

export async function DELETE(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  const userId = gate.session.demo ? `demo-${gate.session.role}` : gate.session.userId;
  await revokeFeedToken(userId);
  return NextResponse.json({ revoked: true });
}

/** Private ICS feed: the token in the URL is the secret (revocable, hash-only storage). */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const raw = (await params).token;
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;
  const userId = await resolveFeedToken(token);
  if (!userId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const fakeSession = { role: "customer", userId: userId.replace(/^demo-/, "demo-customer"), demo: userId.startsWith("demo-") };
    const jobs = visibleJobs(await listJobs(), fakeSession as never).filter((j) => ["booked", "en_route", "in_progress", "pending_verify"].includes(j.status));
    const parts = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TaskLens//Jobs//EN"];
    for (const j of jobs.slice(0, 50)) {
      const spec = await getScanSpec(j.scan_id).catch(() => null);
      parts.push(
        jobToIcs({ id: j.id, title: spec?.title ?? "TaskLens job", slot: j.slot ?? new Date().toISOString(), description: `TaskLens job ${j.id.slice(0, 8)} — $${j.price_usd}` }).split("\r\n").slice(3, -1).join("\r\n"),
      );
    }
    parts.push("END:VCALENDAR");
    return new NextResponse(parts.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
  } catch (e) {
    console.error("[calendar/feed] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "feed_failed" }, { status: 500 });
  }
}
