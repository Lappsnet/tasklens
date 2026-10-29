import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/auth";
import { addBlock, listBlocks, removeBlock } from "@/lib/calendar";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  const url = new URL(req.url);
  const blocks = await listBlocks(gate.session.demo ? undefined : gate.session.userId, url.searchParams.get("proId") ?? undefined);
  return NextResponse.json({ blocks });
}

const Body = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  kind: z.enum(["busy", "recurring", "buffer", "zone"]).default("busy"),
  note: z.string().max(500).default(""),
  proId: z.string().max(100).optional(),
});

/** Block time on the pro calendar (tap a day, set start/end). */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`calblock:${clientKey(req)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    return NextResponse.json({ error: "bad_range" }, { status: 400 });
  }
  const block = await addBlock({
    pro_id: parsed.data.proId,
    user_id: gate.session.demo ? undefined : gate.session.userId,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    kind: parsed.data.kind,
    note: parsed.data.note,
  });
  return NextResponse.json({ block });
}

export async function DELETE(req: Request) {
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ok = await removeBlock(id);
  return ok ? NextResponse.json({ removed: true }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
