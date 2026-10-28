import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ ok: true, day: 1, model: process.env.MODEL_ID ?? "muse-spark-1.3" });
}
