import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, hitRateLimit } from "@/lib/ratelimit";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const Body = z.object({
  municipality: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(120),
  email: z.string().email().max(200),
});

const gs = globalThis as unknown as { __tasklens_city_access?: unknown[] };
const mem = (gs.__tasklens_city_access ??= [] as unknown[]);

/** U5 Alcaldías CTA: municipality access request (public, 5/min, reviewed manually). */
export async function POST(req: Request) {
  if (!(await hitRateLimit(`cityaccess:${clientKey(req)}`, 5))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { error } = await db.from("city_access_requests").insert({
          municipality: parsed.data.municipality.trim(),
          name: parsed.data.name.trim(),
          role: parsed.data.role.trim(),
          email: parsed.data.email.toLowerCase(),
        });
        if (!error) return NextResponse.json({ ok: true });
        console.error("[city/access] insert failed:", error.message);
      }
    } catch (e) {
      console.error("[city/access] error:", e instanceof Error ? e.message : e);
    }
  }
  mem.push({ id: randomUUID(), ...parsed.data, status: "pending", createdAt: Date.now() });
  return NextResponse.json({ ok: true, mock: !hasSupabase() });
}
