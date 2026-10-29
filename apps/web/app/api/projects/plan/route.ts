import { NextResponse } from "next/server";
import { z } from "zod";
import { draftProjectPlan } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getScanMeta } from "@/lib/scans";
import { IMAGE_MIME, MAX_FILE } from "@/lib/scan-pipeline";
import { listPhases, savePhases, saveProject } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 120;

const Fields = z.object({ transcript: z.string().max(2000).default(""), title: z.string().max(120).default("") });

/** S4: walkthrough frames (sampled client-side, up to 8) + transcript → ProjectPlan. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`plan:${clientKey(req)}`, 10))) {
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
  const parsed = Fields.safeParse({ transcript: String(form.get("transcript") ?? ""), title: String(form.get("title") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const frames = form.getAll("frames").filter((v): v is File => v instanceof File && v.size > 0).slice(0, 8);
  if (frames.length === 0) return NextResponse.json({ error: "need_photo" }, { status: 400 });
  for (const f of frames) {
    if (!IMAGE_MIME.has(f.type) || f.size > MAX_FILE) return NextResponse.json({ error: "bad_photo" }, { status: 413 });
  }
  const scanId = String(form.get("scanId") ?? "");
  const base = scanId ? await getScanMeta(scanId) : null;

  try {
    const images = await Promise.all(
      frames.map(async (f) => `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`),
    );
    const fallbackSpec = {
      category: "drywall_paint", title: parsed.data.title || "Remodel walkthrough", diagnosis: parsed.data.transcript || "Walkthrough remodel",
      urgency: "medium", skill_level: "handyman", est_hours: 8, materials: [], price_range_usd: [2000, 4000] as [number, number],
      steps: ["Survey", "Execute", "Verify"], safety_flags: [], questions_for_customer: [], damage_box: null, confidence: 0.6,
    } as never;
    const { plan, mock } = await draftProjectPlan({ spec: base?.spec ?? fallbackSpec, transcript: parsed.data.transcript, images });
    const project = await saveProject({ customer_id: gate.session.demo ? undefined : gate.session.userId, title: plan.title, video_note: parsed.data.transcript.slice(0, 500), plan, status: "planned" });
    const saved = await savePhases(
      project.id,
      plan.phases.map((p) => ({ ...p, status: "planned" as const })),
    );
    return NextResponse.json({ project, phases: saved, mock });
  } catch (e) {
    console.error("[projects/plan] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "plan_failed" }, { status: 500 });
  }
}
