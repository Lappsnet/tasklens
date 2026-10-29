import { NextResponse } from "next/server";
import { z } from "zod";
import { previewAfter } from "@tasklens/ai";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getProject, listPhases, updatePhase } from "@/lib/projects";
import { IMAGE_MIME, MAX_FILE, withTimeout } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ projectId: z.string().min(1).max(100), style: z.enum(["moderno", "rustico", "minimalista"]) });

const STYLE_PROMPT: Record<string, string> = {
  moderno: "modern finish: large gray tiles, floating vanity, matte black fixtures",
  rustico: "rustic finish: warm terracotta tiles, wooden vanity, bronze fixtures",
  minimalista: "minimalist finish: white microcement, wall-hung toilet, chrome fixtures",
};

/** S4: render 3 finish options on the customer's photo; the pick attaches to the phase. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`render:${clientKey(req)}`, 10))) {
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
  const parsed = Body.safeParse({ projectId: String(form.get("projectId") ?? ""), style: String(form.get("style") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const raw = form.get("photo");
  const photo = raw instanceof File ? raw : null;
  if (!photo || photo.size === 0) return NextResponse.json({ error: "need_photo" }, { status: 400 });
  if (!IMAGE_MIME.has(photo.type) || photo.size > MAX_FILE) return NextResponse.json({ error: "bad_photo" }, { status: 413 });

  try {
    if (!process.env.MODEL_API_KEY) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ preview: null, mock: true, note: "render needs MODEL_API_KEY" });
    }
    const buf = Buffer.from(await photo.arrayBuffer());
    const preview = await withTimeout(
      previewAfter({
        photoDataUrl: `data:${photo.type};base64,${buf.toString("base64")}`,
        spec: { category: "drywall_paint", title: parsed.data.style, diagnosis: STYLE_PROMPT[parsed.data.style], urgency: "low", skill_level: "handyman", est_hours: 1, materials: [], price_range_usd: [0, 0], steps: [], safety_flags: [], questions_for_customer: [], damage_box: null, confidence: 0.9 } as never,
      }),
    );
    const project = await getProject(parsed.data.projectId);
    if (project) {
      const phases = await listPhases(project.id);
      const tile = phases.find((p) => p.title.toLowerCase().includes("tile") || p.trade === "drywall_paint");
      if (tile) await updatePhase(project.id, tile.id, { finish_pick: parsed.data.style });
    }
    return NextResponse.json({ preview, style: parsed.data.style, mock: false });
  } catch (e) {
    console.error("[projects/render] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  }
}
