import { NextResponse } from "next/server";
import { z } from "zod";
import { AiSpec, matchAndBook, rankPros } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getMemoryScan, getScanMeta } from "@/lib/scans";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";
import { getAvailability, searchPros } from "@/lib/pros";
import { withTimeout } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  scanId: z.string().min(1).max(100),
  lat: z.number().min(-90).max(90).default(13.6929),
  lng: z.number().min(-180).max(180).default(-89.2182),
  max_km: z.number().min(1).max(200).default(25),
  lang: z.enum(["en", "es"]).default("es"),
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
  if (!(await hitRateLimit(`match:${clientKey(req)}`, 20))) {
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
  const { scanId, lat, lng, max_km, lang } = parsed.data;

  const spec = await loadSpec(scanId);
  if (!spec) return NextResponse.json({ error: "scan_not_found" }, { status: 404 });
  // Ownership: real mode restricts customers to their own scans.
  if (!gate.session.demo && gate.session.role === "customer") {
    const meta = await getScanMeta(scanId);
    if (meta?.customerId && meta.customerId !== gate.session.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // Agent pass first (real ranking when the model is reachable), with a hard
  // ceiling so the host never kills the handler (502). Any failure falls back
  // to deterministic rating-ranked pros — the screen always renders top 3.
  try {
    try {
      const { top3, mock } = await withTimeout(
        matchAndBook(
          { spec, lat, lng, max_km, scan_id: scanId },
          {
            search_pros: (a) => searchPros(a),
            get_availability: (a) => getAvailability(a.pro_id),
            // Match pass never books: guard rejects even if the model tries.
            create_booking: async () => {
              throw new Error("booking_not_allowed_here");
            },
          },
        ),
        25_000,
      );
      const withSlots = await Promise.all(
        top3.map(async (t) => ({ ...t, slots: (await getAvailability(t.pro_id)).slice(0, 6) })),
      );
      const all = await searchPros({ category: spec.category, lat, lng, max_km });
      const coords = withSlots.map((t) => {
        const p = all.find((x) => x.id === t.pro_id);
        return { pro_id: t.pro_id, lat: p?.lat, lng: p?.lng, name: p?.name, rating: p?.rating };
      });
      return NextResponse.json({ scanId, top3: withSlots, coords, mock });
    } catch (e) {
      console.error("[api/match] agent pass failed, using deterministic fallback:", e instanceof Error ? e.message : e);
    }
    const pool = await searchPros({ category: spec.category, lat, lng, max_km });
    if (pool.length === 0) return NextResponse.json({ error: "no_pros" }, { status: 404 });
    const ranked = rankPros({
      category: spec.category,
      pros: pool.map((p) => ({ id: p.id, name: p.name, category: p.category, rating: p.rating })),
      lang,
    });
    const withSlots = await Promise.all(
      ranked.top3.map(async (t, i) => {
        const pro = pool.find((p) => p.id === t.pro_id);
        const base = Math.round((pro?.rate_usd_hr ?? 75) * spec.est_hours);
        return { ...t, quote_usd: base + i * 25, slots: (await getAvailability(t.pro_id)).slice(0, 6) };
      }),
    );
    const coords = withSlots.map((t) => {
      const p = pool.find((x) => x.id === t.pro_id);
      return { pro_id: t.pro_id, lat: p?.lat, lng: p?.lng, name: p?.name, rating: p?.rating };
    });
    return NextResponse.json({ scanId, top3: withSlots, coords, mock: true });
  } catch (e) {
    console.error("[api/match] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "match_failed" }, { status: 500 });
  }
}
