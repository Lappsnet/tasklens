import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking } from "@/lib/jobs";
import { IMAGE_MIME, MAX_FILE } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const Fields = z.object({
  jobId: z.string().min(1).max(100),
  kind: z.enum(["before", "after"]).default("before"),
});

/** Before/after photos appended to the job log (Day 4: before; after lands Day 5). */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`jobphotos:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Fields.safeParse({
    jobId: String(form.get("jobId") ?? ""),
    kind: String(form.get("kind") ?? "before"),
  });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const photos = form.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
  if (photos.length === 0 || photos.length > 3) return NextResponse.json({ error: "need_photo" }, { status: 400 });
  for (const p of photos) {
    if (!IMAGE_MIME.has(p.type) || p.size > MAX_FILE) {
      return NextResponse.json({ error: "bad_photo" }, { status: 413 });
    }
  }
  if (!(await getBooking(parsed.data.jobId))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const ev = await appendEvent(parsed.data.jobId, `photo_${parsed.data.kind}`, {
      count: photos.length,
      sizes: photos.map((p) => p.size),
    });
    return NextResponse.json({ event: ev, count: photos.length });
  } catch (e) {
    console.error("[api/jobs/photos] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "photos_failed" }, { status: 500 });
  }
}
