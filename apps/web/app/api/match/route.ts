import { NextResponse } from "next/server";
import { z } from "zod";
import { AiSpec, matchAndBook } from "@tasklens/ai";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { getMemoryScan } from "@/lib/scans";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";
import { getAvailability, searchPros } from "@/lib/pros";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  scanId: z.string().min(1).max(100),
  lat: z.number().min(-90).max(90).default(25.7617),
  lng: z.number().min(-180).max(180).default(-80.1918),
  max_km: z.number().min(1).max(200).default(25),
});

async function loadSpec(scanId: string): Promise<AiSpec | null> {
  const mem = getMemoryScan(scanId);
  if (mem) return mem.spec;
  if (hasSupabase()) {
    const db = serviceClient();
    if (db) {
      const { data } = await db.from("scans").select("ai_spec").eq("id", scanId).single();
      if (data) {
        const parsed = AiSpec.safeParse((data as { ai_spec: unknown }).ai_spec);
        if (parsed.success) return parsed.data;
      }
    }
  }
  return null;
}

/** Match-only pass: ranks top 3 WITHOUT booking. Booking happens in /api/book. */
export async function POST(req: Request) {
  if (!rateLimit(`match:${clientKey(req)}`, 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { scanId, lat, lng, max_km } = parsed.data;

  const spec = await loadSpec(scanId);
  if (!spec) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });

  try {
    const { top3, mock } = await matchAndBook(
      { spec, lat, lng, max_km, scan_id: scanId },
      {
        search_pros: (a) => searchPros(a),
        get_availability: (a) => getAvailability(a.pro_id),
        // Match pass never books: guard rejects even if the model tries.
        create_booking: async () => {
          throw new Error("booking_not_allowed_here");
        },
      },
    );
    const withSlots = await Promise.all(
      top3.map(async (t) => ({ ...t, slots: (await getAvailability(t.pro_id)).slice(0, 6) })),
    );
    return NextResponse.json({ scanId, top3: withSlots, mock });
  } catch (e) {
    console.error("[api/match] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "match_failed" }, { status: 500 });
  }
}
