import { NextResponse } from "next/server";
import { listEntries, resolveShare } from "@/lib/passport";

export const runtime = "nodejs";

/** Public passport share view: token in the URL is the secret (revocable). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const homeId = await resolveShare((await params).token);
  if (!homeId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const entries = await listEntries(homeId);
  const slim = entries.map((e) => ({ ...e, before_photo: undefined, after_photo: undefined }));
  return NextResponse.json({ entries: slim });
}
