import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getPayouts } from "@/lib/jobs";
import { hasSupabase, serviceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** Pro earnings: pending/paid payouts. Demo returns all; real mode scopes to own pro rows. */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["pro", "admin"]);
  if ("response" in gate) return gate.response;
  try {
    if (!gate.session.demo && gate.session.role === "pro" && hasSupabase()) {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("pros").select("id").eq("user_id", gate.session.userId);
        const ids = ((data as { id: string }[] | null) ?? []).map((p) => p.id);
        return NextResponse.json({ payouts: await getPayouts(ids) });
      }
    }
    return NextResponse.json({ payouts: await getPayouts() });
  } catch (e) {
    console.error("[api/payouts] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "payouts_failed" }, { status: 500 });
  }
}
