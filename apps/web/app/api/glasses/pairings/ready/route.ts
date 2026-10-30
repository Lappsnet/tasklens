import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { markGlassesReady } from "@/lib/pairings";

export const runtime = "nodejs";

const Body = z.object({ code: z.string().min(6).max(12) });

/** Companion reports glasses linked: phone_connected -> glasses_ready. */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`pairready:${clientKey(req)}`, 10))) {
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
  const pairing = await markGlassesReady(parsed.data.code);
  if (!pairing) return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  return NextResponse.json({ id: pairing.id, status: pairing.status });
}
