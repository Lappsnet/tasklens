import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { createPairing, getPairing } from "@/lib/pairings";

export const runtime = "nodejs";

/**
 * U3 glasses pairing: signed-in user mints a 6-char code (10 min, single use).
 * QR encodes the companion deep link; the SVG is generated server-side.
 */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`pair:${clientKey(req)}`, 5))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "company", "admin", "city_operator"]);
  if ("response" in gate) return gate.response;
  try {
    const { pairing, code } = await createPairing(gate.session.userId);
    const deepLink = `tasklens://connect?code=${code}`;
    let qrSvg: string | null = null;
    try {
      qrSvg = await QRCode.toString(deepLink, { type: "svg", margin: 1, width: 220 });
    } catch {
      qrSvg = null;
    }
    return NextResponse.json({ id: pairing.id, code, deepLink, qrSvg, expiresAt: pairing.expiresAt, fallback: "phone" });
  } catch (e) {
    console.error("[api/glasses/pairings] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "pair_failed" }, { status: 500 });
  }
}

/** Poll one pairing's status (owner only — checked server-side). */
export async function GET(req: Request) {
  if (!(await hitRateLimit(`pairstatus:${clientKey(req)}`, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "company", "admin", "city_operator"]);
  if ("response" in gate) return gate.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const pairing = await getPairing(id);
  if (!pairing || (pairing.userId !== gate.session.userId && gate.session.role !== "admin")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const live = pairing.expiresAt > Date.now() && pairing.status !== "expired";
  return NextResponse.json({ status: live ? pairing.status : "expired", deviceLabel: pairing.deviceLabel, expiresAt: pairing.expiresAt });
}
