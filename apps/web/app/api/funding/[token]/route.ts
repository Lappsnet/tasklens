import { NextResponse } from "next/server";
import { getBooking } from "@/lib/jobs";
import { resolveFunding } from "@/lib/funding";
import { getScanSpec } from "@/lib/scans";

export const runtime = "nodejs";

/** S5: public funding view — title, price, contract summary, photos only. Never address/phone. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const link = await resolveFunding((await params).token);
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const booking = await getBooking(link.job_id);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const spec = await getScanSpec(booking.scan_id).catch(() => null);
  return NextResponse.json({
    jobId: booking.id,
    title: spec?.title ?? "TaskLens job",
    amountUsd: booking.price_usd,
    status: booking.status,
    summary: spec?.diagnosis ?? "",
    materials: spec?.materials ?? [],
  });
}
