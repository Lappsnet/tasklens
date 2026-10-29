import { NextResponse } from "next/server";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { getOrCreateHome, mintShareLink } from "@/lib/passport";

export const runtime = "nodejs";

/** Mint a share link for the passport (token shown once, hash-only storage). */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`share:${clientKey(req)}`, 10))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["customer", "admin"]);
  if ("response" in gate) return gate.response;
  const home = await getOrCreateHome(gate.session.demo ? `demo-${gate.session.role}` : gate.session.userId);
  return NextResponse.json(await mintShareLink(home.id));
}
