import { NextResponse } from "next/server";
import { buildAssetLinks } from "@/lib/assetlinks";

export const runtime = "nodejs";

/** P0-5: /.well-known/assetlinks.json — proves com.tasklens.app may open this site borderless. */
export async function GET() {
  const statements = buildAssetLinks();
  if (!statements) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  return NextResponse.json(statements, {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
}
