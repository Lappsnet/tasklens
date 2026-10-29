import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestSlots } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getAvailability, searchPros } from "@/lib/pros";
import { getScanMeta } from "@/lib/scans";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  scanId: z.string().min(1).max(100),
  lat: z.number().default(13.6929),
  lng: z.number().default(-89.2182),
  homeLat: z.number().optional(),
  homeLng: z.number().optional(),
});

/** S2: AI slot suggestions from urgency, availability and travel distance. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`suggest:${clientKey(req)}`, 20))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const meta = await getScanMeta(parsed.data.scanId);
  if (!meta) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });
  try {
    const pros = await searchPros({ category: meta.spec.category, lat: parsed.data.lat, lng: parsed.data.lng, max_km: 25 });
    const candidates: { slot: string; proLat?: number; proLng?: number }[] = [];
    for (const p of pros.slice(0, 5)) {
      for (const s of (await getAvailability(p.id)).slice(0, 4)) {
        candidates.push({ slot: s, proLat: p.lat, proLng: p.lng });
      }
    }
    const out = await suggestSlots({
      spec: meta.spec,
      candidates,
      homeLat: parsed.data.homeLat ?? parsed.data.lat,
      homeLng: parsed.data.homeLng ?? parsed.data.lng,
      busySlots: [],
    });
    return NextResponse.json(out);
  } catch (e) {
    console.error("[calendar/suggest] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "suggest_failed" }, { status: 500 });
  }
}
