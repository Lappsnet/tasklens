import { NextResponse } from "next/server";
import { z } from "zod";
import { triageReport } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { createReport, listReports, suggestContractors, updateReport } from "@/lib/city";
import { CITIES, findCity } from "@/lib/cities";
import { uploadPhoto } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const CreateBody = z.object({
  city_slug: z.string().min(1).max(60),
  description: z.string().min(10).max(2000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * S7: file a public issue for YOUR city. The board is fenced by city_slug —
 * residents only ever see their own city's reports. Coordinates are rounded
 * before storage; photos with people as the subject are rejected, never stored.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`city:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin", "city_operator"]);
  if ("response" in gate) return gate.response;

  let description = "";
  let city_slug = "";
  let lat = 0;
  let lng = 0;
  let photo: File | null = null;
  const ctype = req.headers.get("content-type") ?? "";
  try {
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      description = String(form.get("description") ?? "");
      city_slug = String(form.get("city_slug") ?? "");
      lat = Number(form.get("lat"));
      lng = Number(form.get("lng"));
      const f = form.get("photo");
      if (f instanceof File && f.size > 0) photo = f;
    } else {
      const parsed = CreateBody.safeParse(await req.json());
      if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      ({ description, city_slug, lat, lng } = parsed.data);
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const city = findCity(city_slug);
  if (!city) return NextResponse.json({ error: "unknown_city", cities: CITIES.map((c) => c.slug) }, { status: 400 });
  if (!description || description.length < 10 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (photo && (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 10 * 1024 * 1024)) {
    return NextResponse.json({ error: "bad_photo" }, { status: 400 });
  }

  try {
    let imageDataUrl: string | undefined;
    if (photo) {
      const buf = Buffer.from(await photo.arrayBuffer());
      imageDataUrl = `data:${photo.type};base64,${buf.toString("base64")}`;
    }
    const { triage, mock } = await triageReport({ description, city: city.name, imageDataUrl });
    if (triage.person_subject) return NextResponse.json({ error: "person_subject" }, { status: 422 });
    let photo_url: string | null = null;
    if (photo) {
      const buf = Buffer.from(await photo.arrayBuffer());
      photo_url = await uploadPhoto(buf, photo.type, "city");
    }
    const report = await createReport({
      city_slug: city.slug,
      country_code: city.country_code,
      description,
      lat, lng,
      reporter_id: gate.session.userId,
      triage,
      photo_url,
    });
    return NextResponse.json({ report, mock });
  } catch (e) {
    if (e instanceof Error && e.message === "person_subject") {
      return NextResponse.json({ error: "person_subject" }, { status: 422 });
    }
    console.error("[city/reports] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "report_failed" }, { status: 500 });
  }
}

/** City-fenced board read. `city` is required — no cross-city reads. */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin", "city_operator"]);
  if ("response" in gate) return gate.response;
  const url = new URL(req.url);
  const city = findCity(url.searchParams.get("city") ?? "");
  if (!city) return NextResponse.json({ error: "city_required", cities: CITIES.map((c) => c.slug) }, { status: 400 });
  const status = url.searchParams.get("status") ?? undefined;
  const items = await listReports(city.slug, status);
  const withSuggest =
    gate.session.role === "city_operator" || gate.session.role === "admin"
      ? await Promise.all(items.map(async (r) => ({ ...r, suggested: await suggestContractors(r) })))
      : items;
  return NextResponse.json({ city: city.slug, reports: withSuggest });
}

const PatchBody = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(["open", "triaged", "assigned", "in_progress", "resolved", "closed", "duplicate"]).optional(),
  assigned_pro_id: z.string().max(100).nullable().optional(),
  duplicate_of: z.string().max(100).nullable().optional(),
});

/** Operator dispatch: advance status, assign a contractor, mark duplicates. Fenced to own city. */
export async function PATCH(req: Request) {
  if (!(await hitRateLimit(`cityop:${clientKey(req)}`, 20))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["city_operator", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const actorCity = gate.session.role === "admin" ? null : (gate.session.city ?? "__none__");
    const report = await updateReport(parsed.data.id, {
      status: parsed.data.status,
      assigned_pro_id: parsed.data.assigned_pro_id,
      duplicate_of: parsed.data.duplicate_of,
    }, actorCity);
    if (!report) return NextResponse.json({ error: "not_found_or_other_city" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (e) {
    if (e instanceof Error && e.message === "invalid_transition") {
      return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    }
    console.error("[city/reports] patch failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
