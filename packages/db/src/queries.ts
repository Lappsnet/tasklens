import type { SupabaseClient } from "@supabase/supabase-js";

export async function listPros(db: SupabaseClient, category?: string) {
  let q = db.from("pros").select("*").order("rating", { ascending: false }).limit(50);
  if (category) q = q.eq("category", category);
  return q;
}

export async function createScan(
  db: SupabaseClient,
  row: { customer_id: string; photo_urls: string[]; transcript: string; lang: string; ai_spec: unknown },
) {
  return db.from("scans").insert(row).select().single();
}

export async function createJob(
  db: SupabaseClient,
  row: { scan_id: string; customer_id: string; pro_id: string; status: string; price_usd: number },
) {
  return db.from("jobs").insert(row).select().single();
}

export async function appendJobEvent(
  db: SupabaseClient,
  row: { job_id: string; kind: string; payload?: unknown },
) {
  return db.from("job_events").insert(row).select().single();
}
