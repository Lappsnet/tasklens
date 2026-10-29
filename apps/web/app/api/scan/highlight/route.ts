import { NextResponse } from "next/server";
import { z } from "zod";
import { segmentDamage } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getMemoryScan, getScanSpec } from "@/lib/scans";
import { withTimeout } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ scanId: z.string().min(1).max(100) });

/** P0-3: SAM damage mask for the quote overlay. Best-effort; null → damage_box fallback. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`highlight:${clientKey(req)}`, 20))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.formData().then((fd) => ({ scanId: String(fd.get("scanId") ?? "") }));
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!process.env.MODEL_API_KEY) return NextResponse.json({ mask: null, mock: true });
  try {
    const spec = await getScanSpec(parsed.data.scanId);
    const before = getMemoryScan(parsed.data.scanId)?.photoDataUrl;
    if (!spec || !before) return NextResponse.json({ mask: null, mock: true });
    const sam = await withTimeout(
      (async () => segmentDamage(before, spec.title))() as Promise<unknown>,
      15_000,
    );
    return NextResponse.json({ mask: sam ?? null, mock: false });
  } catch {
    return NextResponse.json({ mask: null, mock: true });
  }
}
