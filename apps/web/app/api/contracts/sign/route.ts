import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { addSignature, checkSignCode, getSignatures, issueSignCode } from "@/lib/contracts";
import { appendEvent } from "@/lib/jobs";
import { hasSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const ReqBody = z.object({ contractId: z.string().min(1).max(100), email: z.string().email().max(200) });

/** Step 1: email one-time code. Demo returns it directly; real mode sends Supabase OTP. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`signreq:${clientKey(req)}`, 10))) {
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
  const parsed = ReqBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    if (hasSupabase()) {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { auth: { persistSession: false } },
      );
      const { error } = await anon.auth.signInWithOtp({ email: parsed.data.email });
      if (error) return NextResponse.json({ error: "otp_failed" }, { status: 503 });
      return NextResponse.json({ sent: true, mock: false });
    }
    const code = issueSignCode(parsed.data.contractId);
    return NextResponse.json({ sent: true, mock: true, code });
  } catch (e) {
    console.error("[sign/request] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }
}

const ConfirmBody = z.object({
  jobId: z.string().min(1).max(100),
  contractId: z.string().min(1).max(100),
  role: z.enum(["customer", "pro"]),
  signerName: z.string().min(2).max(120),
  signaturePng: z.string().startsWith("data:image/png;base64,").max(500_000),
  email: z.string().email().max(200),
  code: z.string().min(4).max(20),
});

/** Step 2: verify code + record typed/drawn signature. Both roles → fully_signed. */
export async function PUT(req: Request) {
  if (!(await hitRateLimit(`signconfirm:${clientKey(req)}`, 10))) {
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
  const parsed = ConfirmBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { jobId, contractId, role, signerName, signaturePng, email, code } = parsed.data;

  try {
    if (hasSupabase()) {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { auth: { persistSession: false } },
      );
      const { error } = await anon.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) return NextResponse.json({ error: "bad_code" }, { status: 400 });
    } else if (!checkSignCode(contractId, code)) {
      return NextResponse.json({ error: "bad_code" }, { status: 400 });
    }
    const sig = await addSignature({
      contract_id: contractId,
      role,
      signer_name: signerName,
      signature_png: signaturePng,
      email,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    const sigs = await getSignatures(contractId);
    const fullySigned = sigs.some((s) => s.role === "customer") && sigs.some((s) => s.role === "pro");
    if (fullySigned) {
      await appendEvent(jobId, "contract_signed", { contract_id: contractId });
    }
    return NextResponse.json({ signature: { id: sig.id, role: sig.role }, fullySigned });
  } catch (e) {
    console.error("[sign/confirm] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }
}
