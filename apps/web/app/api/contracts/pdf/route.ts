import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getContractByJob, getSignatures } from "@/lib/contracts";
import { makeContractPdf } from "@/lib/pdf";
import { sha256Hex } from "@/lib/contracts";
import { signPhotoUrl } from "@/lib/storage";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ jobId: z.string().min(1).max(100) });

/** S1: render the signed contract PDF, hash it, store it, return a download. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`pdf:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const contract = await getContractByJob(parsed.data.jobId);
    if (!contract) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const sigs = await getSignatures(contract.id);
    const buf = makeContractPdf({
      title: contract.title,
      body: contract.body_es,
      signatures: sigs.map((s) => ({ role: s.role, signerName: s.signer_name, email: s.email, signedAt: s.signed_at })),
      footer: "Plantilla generada con IA; no constituye asesoria legal.",
    });
    const hash = sha256Hex(Buffer.from(buf));

    let pdfPath: string | undefined;
    if (hasSupabase()) {
      const db = serviceClient();
      if (db) {
        const path = `contracts/${contract.id}.pdf`;
        const { error } = await db.storage.from(process.env.STORAGE_BUCKET ?? "media").upload(path, buf, { contentType: "application/pdf", upsert: true });
        if (!error) {
          pdfPath = path;
          await db.from("contracts").update({ pdf_path: path, pdf_sha256: hash }).eq("id", contract.id);
        }
      }
    } else {
      const { saveContract } = await import("@/lib/contracts");
      await saveContract({ ...contract, pdf_sha256: hash });
    }

    const download = pdfPath ? await signPhotoUrl(pdfPath, 300) : null;
    return NextResponse.json({ sha256: hash, pdfPath: pdfPath ?? null, downloadUrl: download, mock: !hasSupabase() });
  } catch (e) {
    console.error("[contracts/pdf] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
