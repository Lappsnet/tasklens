import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { claimPairing } from "@/lib/pairings";

export const runtime = "nodejs";

const Body = z.object({
  code: z.string().min(6).max(12),
  deviceLabel: z.string().max(120).default("companion app"),
});

/** Companion app claims a pairing code (user's token): waiting -> phone_connected. Single use. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`pairclaim:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "pro", "company", "admin", "city_operator"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const pairing = await claimPairing(parsed.data.code, parsed.data.deviceLabel);
  if (!pairing) return NextResponse.json({ error: "invalid_or_used" }, { status: 409 });
  return NextResponse.json({ id: pairing.id, status: pairing.status });
}
