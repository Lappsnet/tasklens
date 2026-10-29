import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listClusters } from "@/lib/city";
import { findCity } from "@/lib/cities";

export const runtime = "nodejs";

/** S7: duplicate clusters for one city's board (city required, fenced). */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin", "city_operator"]);
  if ("response" in gate) return gate.response;
  const city = findCity(new URL(req.url).searchParams.get("city") ?? "");
  if (!city) return NextResponse.json({ error: "city_required" }, { status: 400 });
  return NextResponse.json({ city: city.slug, clusters: await listClusters(city.slug) });
}
