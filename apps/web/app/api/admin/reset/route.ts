import { NextResponse } from "next/server";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Day 6: "Reset demo" (admin role only). Clears jobs/payments/events/scans and
 * restores the seed story. Must complete in < 5 s.
 */
export async function POST(req: Request) {
  const gate = await requireRole(req, ["admin"]);
  if ("response" in gate) return gate.response;
  if (!(await hitRateLimit(`admin:${clientKey(req)}`, 5))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const t0 = Date.now();
  try {
    if (hasSupabase()) {
      const db = serviceClient();
      if (!db) throw new Error("no_db");
      for (const table of ["job_events", "payments", "jobs", "scans"]) {
        const { error } = await db.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw new Error(`${table}: ${error.message}`);
      }
      const { count } = await db.from("pros").select("id", { count: "exact", head: true });
      if ((count ?? 0) === 0) throw new Error("seed_missing_run_002");
      return NextResponse.json({ reset: true, ms: Date.now() - t0, pros: count });
    }
    // Demo memory stores: dynamic import avoids pulling server maps client-side.
    const scans = await import("@/lib/scans");
    const jobs = await import("@/lib/jobs");
    (scans as unknown as { __clearForReset?: () => void }).__clearForReset?.();
    (jobs as unknown as { __clearForReset?: () => void }).__clearForReset?.();
    return NextResponse.json({ reset: true, ms: Date.now() - t0, mock: true });
  } catch (e) {
    console.error("[admin/reset] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }
}
