import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getOrCreateHome, listEntries, listReminders } from "@/lib/passport";

export const runtime = "nodejs";

/** S3: the customer's Home Passport — entries, warranty countdowns, reminders. */
export async function GET(req: Request) {
  const gate = await requireRole(req, ["customer", "pro", "admin"]);
  if ("response" in gate) return gate.response;
  try {
    const userId = gate.session.demo ? `demo-${gate.session.role}` : gate.session.userId;
    const home = await getOrCreateHome(userId);
    const [entries, reminders] = await Promise.all([listEntries(home.id), listReminders(home.id)]);
    // Strip bulky photo data URLs from the list view (thumbnails load on demand).
    const slim = entries.map((e) => ({ ...e, before_photo: e.before_photo ? "[photo]" : undefined, after_photo: e.after_photo ? "[photo]" : undefined }));
    return NextResponse.json({ home, entries: slim, reminders });
  } catch (e) {
    console.error("[api/passport] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "passport_failed" }, { status: 500 });
  }
}
