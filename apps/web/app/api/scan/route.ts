import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getMemoryScan } from "@/lib/scans";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";
import { TextFields, processScan, validateUpload } from "@/lib/scan-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!rateLimit(`scan:${clientKey(req)}`, 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = TextFields.safeParse({
    transcript: String(form.get("transcript") ?? ""),
    lang: String(form.get("lang") ?? "en"),
  });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const files = validateUpload(form, "photos");
  if ("error" in files) {
    return NextResponse.json({ error: files.error }, { status: files.error === "need_photo" ? 400 : 413 });
  }

  try {
    return NextResponse.json(
      await processScan({
        photos: files.photos,
        transcript: parsed.data.transcript,
        lang: parsed.data.lang,
        audio: files.audio,
        source: "web",
        userId: gate.session.userId,
      }),
    );
  } catch (e) {
    console.error("[api/scan] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const mem = getMemoryScan(id);
  if (mem) {
    return NextResponse.json({ scanId: mem.scanId, spec: mem.spec, transcript: mem.transcript, lang: mem.lang, mock: true });
  }
  if (hasSupabase()) {
    const db = serviceClient();
    if (db) {
      const { data, error } = await db.from("scans").select("id, transcript, lang, ai_spec").eq("id", id).single();
      if (!error && data) {
        return NextResponse.json({ scanId: data.id, spec: data.ai_spec, transcript: data.transcript, lang: data.lang, mock: false });
      }
    }
  }
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
