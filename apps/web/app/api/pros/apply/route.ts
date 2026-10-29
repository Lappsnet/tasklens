import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { submitApplication } from "@/lib/applications";
import { IMAGE_MIME, MAX_FILE } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const Fields = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  category: z.enum(["plumbing", "electrical", "appliance", "drywall_paint", "assembly", "cleaning"]),
  zone: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  rate_usd_hr: z.coerce.number().int().min(5).max(500).default(40),
});

/**
 * P1: public pro application. No session (new pros have no account yet);
 * strict rate limit (5/min) + Zod + bounded uploads. ID photo required so an
 * admin can manually verify identity before approval.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`apply:${clientKey(req)}`, 5))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Fields.safeParse({
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    category: String(form.get("category") ?? ""),
    zone: String(form.get("zone") ?? ""),
    phone: String(form.get("phone") ?? ""),
    rate_usd_hr: form.get("rate_usd_hr") ? Number(form.get("rate_usd_hr")) : 40,
  });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const raw = form.get("idPhoto");
  const photo = raw instanceof File ? raw : null;
  if (!photo || photo.size === 0) return NextResponse.json({ error: "need_id_photo" }, { status: 400 });
  if (!IMAGE_MIME.has(photo.type) || photo.size > MAX_FILE) {
    return NextResponse.json({ error: "bad_photo" }, { status: 413 });
  }

  try {
    const buf = new Uint8Array(await photo.arrayBuffer());
    const app = await submitApplication({ ...parsed.data, idPhoto: { buf, mime: photo.type } });
    // Never echo the photo back; the admin queue views it via signed URL.
    return NextResponse.json({ id: app.id, status: app.status });
  } catch (e) {
    console.error("[api/pros/apply] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
}
