import { randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";

export interface JobRow {
  id: string;
  scan_id: string;
  pro_id: string;
  status: string;
  price_usd: number;
  slot: string | null;
  createdAt: number;
}

export interface PaymentRow {
  id: string;
  job_id: string;
  stripe_pi_id: string;
  amount_usd: number;
  status: string;
}

const jobs = new Map<string, JobRow>();
const payments = new Map<string, PaymentRow>(); // keyed by job_id

export function saveMemoryJob(j: Omit<JobRow, "id" | "createdAt">): JobRow {
  const row: JobRow = { ...j, id: randomUUID(), createdAt: Date.now() };
  jobs.set(row.id, row);
  return row;
}

export function getMemoryJob(id: string): JobRow | undefined {
  return jobs.get(id);
}

export function saveMemoryPayment(p: Omit<PaymentRow, "id">): PaymentRow {
  const row: PaymentRow = { ...p, id: randomUUID() };
  payments.set(row.job_id, row);
  return row;
}

export function getMemoryPaymentByJob(jobId: string): PaymentRow | undefined {
  return payments.get(jobId);
}

/** Persist job + payment. Supabase when configured, else memory. Returns job id. */
export async function persistBooking(args: {
  scan_id: string;
  pro_id: string;
  price_usd: number;
  slot: string;
  stripe_pi_id: string;
}): Promise<{ jobId: string; mock: boolean }> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        // Documented service-role use: anonymous Day 3 demo has no auth session yet.
        const { data: job, error: jobErr } = await db
          .from("jobs")
          .insert({
            scan_id: args.scan_id,
            pro_id: args.pro_id,
            status: "booked",
            price_usd: args.price_usd,
            slot: args.slot,
          })
          .select("id")
          .single();
        if (!jobErr && job) {
          await db.from("payments").insert({
            job_id: (job as { id: string }).id,
            stripe_pi_id: args.stripe_pi_id,
            amount_usd: args.price_usd,
            status: "requires_capture",
          });
          await db.from("job_events").insert({
            job_id: (job as { id: string }).id,
            kind: "booked",
            payload: { pro_id: args.pro_id, slot: args.slot, stripe_pi_id: args.stripe_pi_id },
          });
          return { jobId: (job as { id: string }).id, mock: false };
        }
        console.error("[book] supabase job insert failed:", jobErr?.message);
      }
    } catch (e) {
      console.error("[book] supabase error:", e instanceof Error ? e.message : e);
    }
  }
  const row = saveMemoryJob({
    scan_id: args.scan_id,
    pro_id: args.pro_id,
    status: "booked",
    price_usd: args.price_usd,
    slot: args.slot,
  });
  saveMemoryPayment({
    job_id: row.id,
    stripe_pi_id: args.stripe_pi_id,
    amount_usd: args.price_usd,
    status: "requires_capture",
  });
  return { jobId: row.id, mock: true };
}

export async function getBooking(jobId: string): Promise<(JobRow & { payment?: PaymentRow }) | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data: job } = await db.from("jobs").select("*").eq("id", jobId).single();
        if (job) {
          const { data: pay } = await db.from("payments").select("*").eq("job_id", jobId).single();
          return { ...(job as unknown as JobRow), payment: (pay as unknown as PaymentRow) ?? undefined };
        }
      }
    } catch (e) {
      console.error("[book] supabase read error:", e instanceof Error ? e.message : e);
    }
  }
  const mem = getMemoryJob(jobId);
  if (!mem) return null;
  return { ...mem, payment: getMemoryPaymentByJob(jobId) };
}

export async function updatePaymentStatus(stripePiId: string, status: string): Promise<void> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        await db.from("payments").update({ status }).eq("stripe_pi_id", stripePiId);
        return;
      }
    } catch (e) {
      console.error("[webhook] supabase error:", e instanceof Error ? e.message : e);
    }
  }
  for (const p of payments.values()) {
    if (p.stripe_pi_id === stripePiId) p.status = status;
  }
}
