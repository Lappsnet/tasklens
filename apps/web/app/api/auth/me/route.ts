import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/** Who am I? Lets the UI show role and toggle demo roles. */
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ userId: session.userId, role: session.role, demo: session.demo });
}
