import { randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";
import { addApprovedPro } from "./pros";
import { signPhotoUrl, uploadPhoto } from "./storage";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface ProApplication {
  id: string;
  name: string;
  category: string;
  zone: string;
  phone: string;
  rate_usd_hr: number;
  /** Private-bucket path (real mode) or bounded data URL (memory mode). */
  idPhotoRef: string | null;
  idPhotoMime: string | null;
  status: ApplicationStatus;
  reject_reason: string | null;
  reviewed_by: string | null;
  createdAt: number;
  reviewedAt: number | null;
}

const gs = globalThis as unknown as { __tasklens_applications?: Map<string, ProApplication> };
const applications = (gs.__tasklens_applications ??= new Map<string, ProApplication>());

/** Test/admin helper: clear the demo application queue. */
export function __clearApplications(): void {
  applications.clear();
}

export interface ApplicationInput {
  name: string;
  category: string;
  zone: string;
  phone: string;
  rate_usd_hr: number;
  idPhoto: { buf: Uint8Array; mime: string } | null;
}

/** Submit a pro application. Public form posts here; heavy rate limit at the route. */
export async function submitApplication(input: ApplicationInput): Promise<ProApplication> {
  let idPhotoRef: string | null = null;
  let idPhotoMime: string | null = null;
  if (input.idPhoto) {
    idPhotoMime = input.idPhoto.mime;
    if (hasSupabase()) {
      idPhotoRef = await uploadPhoto(input.idPhoto.buf, input.idPhoto.mime, "id-photos");
    } else {
      // Demo: keep a bounded data URL so the admin queue can review it.
      const b64 = Buffer.from(input.idPhoto.buf).toString("base64");
      const url = `data:${input.idPhoto.mime};base64,${b64}`;
      idPhotoRef = url.length <= 1_500_000 ? url : null;
    }
  }
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db
          .from("pro_applications")
          .insert({
            name: input.name,
            category: input.category,
            zone: input.zone,
            phone: input.phone,
            rate_usd_hr: input.rate_usd_hr,
            id_photo_path: idPhotoRef,
            status: "pending",
          })
          .select("*")
          .single();
        if (!error && data) return rowFromDb(data);
        console.error("[applications] insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[applications] error:", e instanceof Error ? e.message : e);
    }
  }
  const row: ProApplication = {
    id: randomUUID(),
    name: input.name,
    category: input.category,
    zone: input.zone,
    phone: input.phone,
    rate_usd_hr: input.rate_usd_hr,
    idPhotoRef,
    idPhotoMime,
    status: "pending",
    reject_reason: null,
    reviewed_by: null,
    createdAt: Date.now(),
    reviewedAt: null,
  };
  applications.set(row.id, row);
  return row;
}

export async function listApplications(status?: ApplicationStatus): Promise<ProApplication[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        let q = db.from("pro_applications").select("*").order("created_at", { ascending: false }).limit(100);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (!error && data) return (data as unknown[]).map(rowFromDb);
      }
    } catch (e) {
      console.error("[applications] list error:", e instanceof Error ? e.message : e);
    }
  }
  const all = [...applications.values()].sort((a, b) => b.createdAt - a.createdAt);
  return status ? all.filter((a) => a.status === status) : all;
}

export async function getApplication(id: string): Promise<ProApplication | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("pro_applications").select("*").eq("id", id).single();
        if (!error && data) return rowFromDb(data);
      }
    } catch (e) {
      console.error("[applications] get error:", e instanceof Error ? e.message : e);
    }
  }
  return applications.get(id) ?? null;
}

/**
 * Admin decision. Approve creates the pro (pros table in real mode, approved
 * memory pool in demo) so match/search sees them immediately.
 */
export async function decideApplication(
  id: string,
  approve: boolean,
  reviewer: string,
  reason?: string,
): Promise<ProApplication | null> {
  const status: ApplicationStatus = approve ? "approved" : "rejected";
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data: app, error: appErr } = await db
          .from("pro_applications")
          .update({ status, reject_reason: approve ? null : (reason ?? null), reviewed_by: reviewer, reviewed_at: new Date().toISOString() })
          .eq("id", id)
          .eq("status", "pending")
          .select("*")
          .single();
        if (appErr || !app) return null;
        const row = rowFromDb(app);
        if (approve) {
          await db.from("pros").insert({
            user_id: null,
            name: row.name,
            category: row.category,
            rating: 4.5,
            reviews: 0,
            rate_usd_hr: row.rate_usd_hr,
            city: row.zone,
          });
        }
        return row;
      }
    } catch (e) {
      console.error("[applications] decide error:", e instanceof Error ? e.message : e);
      return null;
    }
  }
  const row = applications.get(id);
  if (!row || row.status !== "pending") return null;
  row.status = status;
  row.reject_reason = approve ? null : (reason ?? null);
  row.reviewed_by = reviewer;
  row.reviewedAt = Date.now();
  if (approve) {
    addApprovedPro({
      id: `pro-${row.id.slice(0, 8)}`,
      name: row.name,
      category: row.category,
      rating: 4.5,
      rate_usd_hr: row.rate_usd_hr,
      city: row.zone,
      lat: 13.6929,
      lng: -89.2182,
    });
  }
  return row;
}

/** Signed 60 s viewing URL for an ID photo (private bucket in real mode). */
export async function idPhotoUrl(app: ProApplication): Promise<string | null> {
  if (!app.idPhotoRef) return null;
  if (app.idPhotoRef.startsWith("data:")) return app.idPhotoRef;
  return signPhotoUrl(app.idPhotoRef);
}

function rowFromDb(r: unknown): ProApplication {
  const x = r as Record<string, unknown>;
  return {
    id: String(x.id),
    name: String(x.name),
    category: String(x.category),
    zone: String(x.zone ?? ""),
    phone: String(x.phone ?? ""),
    rate_usd_hr: Number(x.rate_usd_hr ?? 40),
    idPhotoRef: (x.id_photo_path as string) ?? null,
    idPhotoMime: "image/jpeg",
    status: (x.status as ApplicationStatus) ?? "pending",
    reject_reason: (x.reject_reason as string) ?? null,
    reviewed_by: (x.reviewed_by as string) ?? null,
    createdAt: x.created_at ? Date.parse(String(x.created_at)) : Date.now(),
    reviewedAt: x.reviewed_at ? Date.parse(String(x.reviewed_at)) : null,
  };
}
