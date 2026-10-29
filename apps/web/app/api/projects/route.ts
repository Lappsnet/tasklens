import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getProject, listPhases } from "@/lib/projects";

export const runtime = "nodejs";

/** S4: project + phases + dependencies for the Gantt view. */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ project, phases: await listPhases(id) });
}
