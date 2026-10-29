import { randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";
import { searchPros } from "./pros";
import type { CityTriage } from "@tasklens/ai";

/**
 * S7 TaskLens for Cities. Every read/write is fenced by city_slug: a resident
 * only ever sees their own city's board, and operators only manage their own
 * municipality. Exact coordinates are rounded to 4 decimals (~11 m) before
 * storage — "snapped to the street", never a doorstep.
 */

export type ReportStatus = "open" | "triaged" | "assigned" | "in_progress" | "resolved" | "closed" | "duplicate";

export interface PublicReport {
  id: string;
  city_slug: string;
  country_code: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  lat: number;
  lng: number;
  status: ReportStatus;
  reporter_id: string;
  assigned_pro_id: string | null;
  duplicate_of: string | null;
  photo_url: string | null;
  proof_url: string | null;
  sla_due: string;
  cluster_id: string | null;
  created_at: string;
}

export interface ReportCluster {
  id: string;
  city_slug: string;
  category: string;
  lat: number;
  lng: number;
  report_count: number;
  status: string;
}

const CLUSTER_KM = 0.15;

const gs = globalThis as unknown as {
  __tasklens_reports?: Map<string, PublicReport>;
  __tasklens_clusters?: Map<string, ReportCluster>;
};
const reports = (gs.__tasklens_reports ??= new Map<string, PublicReport>());
const clusters = (gs.__tasklens_clusters ??= new Map<string, ReportCluster>());

function snap(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

function toRow(r: PublicReport) {
  return {
    id: r.id, city_slug: r.city_slug, country_code: r.country_code, title: r.title,
    category: r.category, severity: r.severity, description: r.description,
    lat: r.lat, lng: r.lng, status: r.status, reporter_id: r.reporter_id,
    assigned_pro_id: r.assigned_pro_id, duplicate_of: r.duplicate_of,
    photo_url: r.photo_url, proof_url: r.proof_url, sla_due: r.sla_due, cluster_id: r.cluster_id,
  };
}

/** Create a triaged report; joins/creates a duplicate cluster. Rejects person-subject photos. */
export async function createReport(args: {
  city_slug: string;
  country_code: string;
  description: string;
  lat: number;
  lng: number;
  reporter_id: string;
  triage: CityTriage;
  photo_url?: string | null;
}): Promise<PublicReport> {
  if (args.triage.person_subject) throw new Error("person_subject");
  const lat = snap(args.lat);
  const lng = snap(args.lng);
  const now = new Date();
  const row: PublicReport = {
    id: randomUUID(),
    city_slug: args.city_slug,
    country_code: args.country_code,
    title: args.triage.title_es,
    category: args.triage.category,
    severity: args.triage.severity,
    description: args.description.slice(0, 2000),
    lat, lng,
    status: "triaged",
    reporter_id: args.reporter_id,
    assigned_pro_id: null,
    duplicate_of: null,
    photo_url: args.photo_url ?? null,
    proof_url: null,
    sla_due: new Date(now.getTime() + args.triage.sla_hours * 3600_000).toISOString(),
    cluster_id: null,
    created_at: now.toISOString(),
  };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("public_reports").insert(toRow(row)).select("*").single();
        if (!error && data) return data as unknown as PublicReport;
      }
    } catch (e) {
      console.error("[city] insert error:", e instanceof Error ? e.message : e);
    }
  }
  row.cluster_id = joinCluster(row);
  reports.set(row.id, row);
  return row;
}

function joinCluster(row: PublicReport): string | null {
  const open = [...clusters.values()].filter(
    (c) => c.city_slug === row.city_slug && c.category === row.category && c.status !== "closed",
  );
  for (const c of open) {
    if (distKm(row.lat, row.lng, c.lat, c.lng) <= CLUSTER_KM) {
      c.report_count += 1;
      c.lat = Math.round(((c.lat * (c.report_count - 1) + row.lat) / c.report_count) * 10000) / 10000;
      c.lng = Math.round(((c.lng * (c.report_count - 1) + row.lng) / c.report_count) * 10000) / 10000;
      return c.id;
    }
  }
  const c: ReportCluster = {
    id: randomUUID(), city_slug: row.city_slug, category: row.category,
    lat: row.lat, lng: row.lng, report_count: 1, status: "open",
  };
  clusters.set(c.id, c);
  return c.id;
}

/** City-fenced read: callers MUST pass a city; cross-city reads are impossible. */
export async function listReports(city_slug: string, status?: string): Promise<PublicReport[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        let q = db.from("public_reports").select("*").eq("city_slug", city_slug).order("created_at", { ascending: false }).limit(200);
        if (status) q = q.eq("status", status);
        const { data } = await q;
        if (data) return data as unknown as PublicReport[];
      }
    } catch (e) {
      console.error("[city] list error:", e instanceof Error ? e.message : e);
    }
  }
  return [...reports.values()]
    .filter((r) => r.city_slug === city_slug && (!status || r.status === status))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function listClusters(city_slug: string): Promise<ReportCluster[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("report_clusters").select("*").eq("city_slug", city_slug);
        if (data) return data as unknown as ReportCluster[];
      }
    } catch (e) {
      console.error("[city] clusters error:", e instanceof Error ? e.message : e);
    }
  }
  return [...clusters.values()].filter((c) => c.city_slug === city_slug);
}

const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  open: ["triaged"],
  triaged: ["assigned", "duplicate", "in_progress"],
  assigned: ["in_progress", "triaged"],
  in_progress: ["resolved", "assigned"],
  resolved: ["closed", "in_progress"],
  closed: [],
  duplicate: [],
};

/**
 * Operator mutation. The caller enforces the municipality fence:
 * city_operator may only touch their own city_slug (admin bypasses).
 */
export async function updateReport(
  id: string,
  patch: { status?: ReportStatus; assigned_pro_id?: string | null; duplicate_of?: string | null; proof_url?: string | null },
  actorCity: string | null,
): Promise<PublicReport | null> {
  const apply = (r: PublicReport): PublicReport | null => {
    if (actorCity && r.city_slug !== actorCity) return null;
    if (patch.status && !TRANSITIONS[r.status].includes(patch.status)) throw new Error("invalid_transition");
    return { ...r, ...patch };
  };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data: cur } = await db.from("public_reports").select("*").eq("id", id).single();
        if (!cur) return null;
        const next = apply(cur as unknown as PublicReport);
        if (!next) return null;
        const { data, error } = await db.from("public_reports").update(toRow(next)).eq("id", id).select("*").single();
        if (!error && data) return data as unknown as PublicReport;
      }
    } catch (e) {
      if (e instanceof Error && e.message === "invalid_transition") throw e;
      console.error("[city] update error:", e instanceof Error ? e.message : e);
    }
  }
  const cur = reports.get(id);
  if (!cur) return null;
  const next = apply(cur);
  if (!next) return null;
  reports.set(id, next);
  return next;
}

/** Suggested certified contractors: top pros of the needed trade near the report. */
export async function suggestContractors(report: PublicReport): Promise<{ id: string; name: string; rating: number; city?: string }[]> {
  const tradeMap: Record<string, string> = {
    water_leak: "plumbing",
    street_light: "electrical",
    road: "drywall_paint",
    sidewalk: "drywall_paint",
    drainage: "plumbing",
    waste: "cleaning",
  };
  const trade = tradeMap[report.category] ?? "assembly";
  const pros = await searchPros({ category: trade, lat: report.lat, lng: report.lng, max_km: 40 });
  return pros.slice(0, 3).map((p) => ({ id: p.id, name: p.name, rating: p.rating ?? 0, city: p.city }));
}
