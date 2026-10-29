import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { idPhotoUrl, listApplications } from "@/lib/applications";

export const runtime = "nodejs";

/** P1: admin verification queue. Pending first; ID photos via signed URLs only. */
export async function GET(req: Request) {
  if (!(await hitRateLimit(`queue:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["admin"]);
  if ("response" in gate) return gate.response;
  const status = new URL(req.url).searchParams.get("status");
  const parsed = z.enum(["pending", "approved", "rejected"]).safeParse(status ?? "pending");

  try {
    const apps = await listApplications(parsed.success ? parsed.data : undefined);
    const items = await Promise.all(
      apps.map(async (a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        zone: a.zone,
        phone: a.phone,
        rate_usd_hr: a.rate_usd_hr,
        status: a.status,
        reject_reason: a.reject_reason,
        reviewed_by: a.reviewed_by,
        createdAt: a.createdAt,
        idPhotoUrl: await idPhotoUrl(a),
      })),
    );
    return NextResponse.json({ applications: items });
  } catch (e) {
    console.error("[api/pros/applications] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "queue_failed" }, { status: 500 });
  }
}
