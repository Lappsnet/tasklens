import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCompletion } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { appendEvent, getBooking, persistBooking } from "@/lib/jobs";
import { listEntries } from "@/lib/passport";
import { getOrCreateHome } from "@/lib/passport";
import { getMemoryScan } from "@/lib/scans";
import { IMAGE_MIME, MAX_FILE, withTimeout } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

function demoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return !process.env.MODEL_API_KEY;
}

const ClaimBody = z.object({ entryId: z.string().min(1).max(100) });

/**
 * S3 warranty claim: within the warranty window, the customer scans the same
 * spot; Muse compares with the passport "after" photo. Pass → $0 warranty job
 * with the original pro.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`warranty:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "admin"]);
  if ("response" in gate) return gate.response;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = ClaimBody.safeParse({ entryId: String(form.get("entryId") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const raw = form.get("photo");
  const photo = raw instanceof File ? raw : null;
  if (!photo || photo.size === 0) return NextResponse.json({ error: "need_photo" }, { status: 400 });
  if (!IMAGE_MIME.has(photo.type) || photo.size > MAX_FILE) {
    return NextResponse.json({ error: "bad_photo" }, { status: 413 });
  }

  try {
    const home = await getOrCreateHome(gate.session.demo ? 'demo-' + gate.session.role : gate.session.userId);
    const entry = (await listEntries(home.id)).find((e) => e.id === parsed.data.entryId);
    if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (entry.warranty_until && entry.warranty_until < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: "warranty_expired", until: entry.warranty_until }, { status: 409 });
    }
    const buf = Buffer.from(await photo.arrayBuffer());
    const dataUrl = `data:${photo.type};base64,${buf.toString("base64")}`;
    const before = entry.after_photo ?? getMemoryScan(entry.job_id)?.photoDataUrl;
    let pass: boolean;
    if (demoMode() || !before) {
      pass = true;
    } else {
      const spec = {
        category: entry.category,
        title: entry.title,
        diagnosis: entry.title,
        urgency: "medium",
        skill_level: "handyman",
        est_hours: 1,
        materials: [],
        price_range_usd: [0, 0],
        steps: ["Re-check repair"],
        safety_flags: [],
        questions_for_customer: [],
        damage_box: null,
        confidence: 1,
      } as const;
      const v = await withTimeout(verifyCompletion({ before: [before], after: [dataUrl], spec: spec as never }));
      pass = v.verdict === "pass";
    }
    if (!pass) return NextResponse.json({ error: "no_defect_found" }, { status: 409 });
    const { jobId } = await persistBooking({
      scan_id: entry.job_id,
      customer_id: gate.session.demo ? undefined : gate.session.userId,
      pro_id: entry.pro_id ?? "mock-carlos",
      price_usd: 0,
      slot: new Date().toISOString().slice(0, 16),
      status: "booked",
      provider: "mock",
      stripe_pi_id: "warranty",
      paymentStatus: "succeeded",
    });
    await appendEvent(jobId, "warranty_claim", { entry_id: entry.id });
    return NextResponse.json({ jobId, warranty: true, mock: demoMode() });
  } catch (e) {
    console.error("[warranty/claim] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
}

const RebookBody = z.object({ entryId: z.string().min(1).max(100) });

/** S3 one-tap rebook: same trade + pro, current midpoint skipped — uses the entry job's price. */
export async function PUT(req: Request) {
  if (!(await hitRateLimit(`rebook:${clientKey(req)}`, 10))) {
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
  const parsed = RebookBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const home = await getOrCreateHome(gate.session.demo ? 'demo-' + gate.session.role : gate.session.userId);
    const entry = (await listEntries(home.id)).find((e) => e.id === parsed.data.entryId);
    if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const prev = await getBooking(entry.job_id);
    const { jobId } = await persistBooking({
      scan_id: entry.job_id,
      customer_id: gate.session.demo ? undefined : gate.session.userId,
      pro_id: entry.pro_id ?? "mock-carlos",
      price_usd: prev?.price_usd ?? 100,
      slot: new Date(Date.now() + 86400_000).toISOString().slice(0, 16),
      status: "quoted",
      provider: "mock",
      stripe_pi_id: "pending",
      paymentStatus: "created",
    });
    return NextResponse.json({ jobId, mock: true });
  } catch (e) {
    console.error("[passport/rebook] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "rebook_failed" }, { status: 500 });
  }
}
