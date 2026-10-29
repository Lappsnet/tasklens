import { NextResponse } from "next/server";
import { z } from "zod";
import { draftContract, mockContractDraft } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { contractFromDraft, getContractByJob, saveContract } from "@/lib/contracts";
import { getBooking } from "@/lib/jobs";
import { getScanSpec } from "@/lib/scans";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ jobId: z.string().min(1).max(100), warrantyDays: z.number().int().min(0).max(365).default(30) });

/** S1: draft the bilingual service agreement from ai_spec + booking. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`contract:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
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
  if (!gate.session.demo && gate.session.role === "customer" && booking.customer_id && booking.customer_id !== gate.session.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const spec = await getScanSpec(booking.scan_id);
  if (!spec) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });

  try {
    const existing = await getContractByJob(parsed.data.jobId);
    if (existing) return NextResponse.json({ contract: existing, mock: false });
    const input = {
      spec,
      jobId: booking.id,
      proName: "Pro",
      customerName: "Customer",
      slot: booking.slot ?? "",
      priceUsd: booking.price_usd,
      warrantyDays: parsed.data.warrantyDays,
    };
    const { draft, mock } = process.env.MODEL_API_KEY
      ? await draftContract(input).catch(() => ({ draft: mockContractDraft(input), mock: true as const }))
      : { draft: mockContractDraft(input), mock: true as const };
    const contract = await saveContract(contractFromDraft(booking.id, draft));
    return NextResponse.json({ contract, mock });
  } catch (e) {
    console.error("[api/contracts/draft] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "draft_failed" }, { status: 500 });
  }
}
