import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { signPhotoUrl } from "@/lib/storage";

export const runtime = "nodejs";

const Body = z.object({ path: z.string().min(1).max(500) });

/** Mint a 60-second signed URL for a private media object. */
export async function POST(req: Request) {
  if (!rateLimit(`sign:${clientKey(req)}`, 30)) {
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
  // Path traversal guard: only simple object names under our prefixes.
  if (parsed.data.path.includes("..") || parsed.data.path.startsWith("/")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const url = await signPhotoUrl(parsed.data.path);
  if (!url) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  return NextResponse.json({ url, expiresIn: 60 });
}
