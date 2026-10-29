import { randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";

export interface JobRow {
  id: string;
  scan_id: string;
  customer_id?: string;
  pro_id: string;
  status: string;
  price_usd: number;
  slot: string | null;
  verify_result?: unknown;
  createdAt: number;
}

export interface PaymentRow {
  id: string;
  job_id: string;
  /** Legacy Stripe PI id; now also holds the PayPal authorization id. Prefer authorizationId. */
  stripe_pi_id: string;
  provider?: string;
  orderId?: string;
  authorizationId?: string;
  amount_usd: number;
  status: string;
}

export interface JobEvent {
  id: string;
  job_id: string;
  kind: string;
  payload: unknown;
  createdAt: number;
}

// Process-wide stores: Next.js dev can evaluate this module twice (dual bundling),
// so module-level Maps would split. globalThis is shared by every evaluation.
const gs = globalThis as unknown as {
  __tasklens_jobs?: Map<string, JobRow>;
  __tasklens_payments?: Map<string, PaymentRow>;
  __tasklens_events?: Map<string, JobEvent[]>;
  __tasklens_payouts?: Map<string, PayoutRow>;
};
const jobs = (gs.__tasklens_jobs ??= new Map<string, JobRow>());
const payments = (gs.__tasklens_payments ??= new Map<string, PaymentRow>()); // keyed by job_id
const events = (gs.__tasklens_events ??= new Map<string, JobEvent[]>()); // keyed by job_id

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

/** Test/admin helper: clear the demo memory stores. */
export function __clearForReset(): void {
  jobs.clear();
  payments.clear();
  events.clear();
  payouts.clear();
}

/** Persist job + payment. Supabase when configured, else memory. Returns job id. */
export async function persistBooking(args: {
  scan_id: string;
  customer_id?: string;
  pro_id: string;
  price_usd: number;
  slot: string;
  status?: "quoted" | "booked";
  provider?: string;
  orderId?: string;
  authorizationId?: string;
  stripe_pi_id: string;
  paymentStatus?: string;
}): Promise<{ jobId: string; mock: boolean }> {
  const status = args.status ?? "booked";
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        // Documented service-role use: server validates the session before writing.
        const { data: job, error: jobErr } = await db
          .from("jobs")
          .insert({
            scan_id: args.scan_id,
            customer_id: args.customer_id ?? null,
            pro_id: args.pro_id,
            status,
            price_usd: args.price_usd,
            slot: args.slot,
          })
          .select("id")
          .single();
        if (!jobErr && job) {
          await db.from("payments").insert({
            job_id: (job as { id: string }).id,
            provider: args.provider ?? "stripe",
            order_id: args.orderId ?? null,
            authorization_id: args.authorizationId ?? null,
            stripe_pi_id: args.authorizationId ?? args.stripe_pi_id,
            amount_usd: args.price_usd,
            status: args.paymentStatus ?? "requires_capture",
          });
          await db.from("job_events").insert({
            job_id: (job as { id: string }).id,
            kind: status,
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
    customer_id: args.customer_id,
    pro_id: args.pro_id,
    status,
    price_usd: args.price_usd,
    slot: args.slot,
  });
  saveMemoryPayment({
    job_id: row.id,
    stripe_pi_id: args.authorizationId ?? args.stripe_pi_id,
    provider: args.provider,
    orderId: args.orderId,
    authorizationId: args.authorizationId,
    amount_usd: args.price_usd,
    status: args.paymentStatus ?? "requires_capture",
  });
  const list = events.get(row.id) ?? [];
  list.push({ id: randomUUID(), job_id: row.id, kind: status, payload: { pro_id: args.pro_id, slot: args.slot }, createdAt: Date.now() });
  events.set(row.id, list);
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
    if (p.stripe_pi_id === stripePiId || p.authorizationId === stripePiId) p.status = status;
  }
}

export interface PayoutRow {
  id: string;
  job_id: string;
  pro_id: string;
  amount_usd: number;
  fee_usd: number;
  status: string;
}

const payouts = (gs.__tasklens_payouts ??= new Map<string, PayoutRow>()); // keyed by job_id

/** Record the pro's payout ledger row on capture (amount minus platform fee). */
export async function recordPayout(args: { jobId: string; proId: string; amountUsd: number }): Promise<PayoutRow> {
  const feePct = Number(process.env.PLATFORM_FEE_PCT ?? 10);
  const fee_usd = Math.max(0, Math.round((args.amountUsd * feePct) / 100));
  const row: PayoutRow = {
    id: randomUUID(),
    job_id: args.jobId,
    pro_id: args.proId,
    amount_usd: Math.max(0, args.amountUsd - fee_usd),
    fee_usd,
    status: "pending",
  };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db
          .from("payouts")
          .insert({ job_id: row.job_id, pro_id: row.pro_id, amount_usd: row.amount_usd, fee_usd: row.fee_usd, status: row.status })
          .select("*")
          .single();
        if (!error && data) return data as unknown as PayoutRow;
        console.error("[payouts] insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[payouts] error:", e instanceof Error ? e.message : e);
    }
  }
  payouts.set(row.job_id, row);
  return row;
}

/** Pro payout rows. Demo returns all; real mode filters by the caller's pro rows server-side. */
export async function getPayouts(proIds?: string[]): Promise<PayoutRow[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        let q = db.from("payouts").select("*").order("created_at", { ascending: false }).limit(100);
        if (proIds && proIds.length > 0) q = q.in("pro_id", proIds);
        const { data, error } = await q;
        if (!error && data) return data as unknown as PayoutRow[];
      }
    } catch (e) {
      console.error("[payouts] read error:", e instanceof Error ? e.message : e);
    }
  }
  const all = [...payouts.values()];
  return proIds && proIds.length > 0 ? all.filter((p) => proIds.includes(p.pro_id)) : all;
}

// --- Day 4: job mode + realtime log ---

/** Defense-in-depth ownership filter. Demo mode returns everything (documented);
 * real mode restricts customers to their own jobs. (Supabase RLS enforces per-row.) */
export function visibleJobs<T extends { customer_id?: string }>(
  rows: T[],
  session: { role: string; userId: string; demo: boolean },
): T[] {
  if (session.demo || session.role !== "customer") return rows;
  return rows.filter((r) => !r.customer_id || r.customer_id === session.userId);
}
/** Valid transitions (P0-2 adds quoted→booked on PayPal authorization). completed only via verify pass. */
export const TRANSITIONS: Record<string, string[]> = {
  quoted: ["booked"],
  booked: ["en_route"],
  en_route: ["in_progress"],
  in_progress: ["pending_verify"],
  pending_verify: ["completed"],
};

export async function appendEvent(jobId: string, kind: string, payload: unknown): Promise<JobEvent> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db
          .from("job_events")
          .insert({ job_id: jobId, kind, payload })
          .select("id,job_id,kind,payload,created_at")
          .single();
        if (!error && data) {
          const r = data as unknown as { id: string; job_id: string; kind: string; payload: unknown; created_at: string };
          return { id: r.id, job_id: r.job_id, kind: r.kind, payload: r.payload, createdAt: Date.parse(r.created_at) };
        }
        console.error("[jobs] event insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[jobs] event error:", e instanceof Error ? e.message : e);
    }
  }
  const ev: JobEvent = { id: randomUUID(), job_id: jobId, kind, payload, createdAt: Date.now() };
  const list = events.get(jobId) ?? [];
  list.push(ev);
  events.set(jobId, list);
  return ev;
}

export async function getEvents(jobId: string): Promise<JobEvent[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db
          .from("job_events")
          .select("id,job_id,kind,payload,created_at")
          .eq("job_id", jobId)
          .order("created_at", { ascending: true });
        if (!error && data) {
          return (data as unknown as { id: string; job_id: string; kind: string; payload: unknown; created_at: string }[]).map(
            (r) => ({ id: r.id, job_id: r.job_id, kind: r.kind, payload: r.payload, createdAt: Date.parse(r.created_at) }),
          );
        }
      }
    } catch (e) {
      console.error("[jobs] events read error:", e instanceof Error ? e.message : e);
    }
  }
  return events.get(jobId) ?? [];
}

export async function listJobs(status?: string): Promise<JobRow[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        let q = db.from("jobs").select("*").order("created_at", { ascending: false }).limit(50);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (!error && data) return data as unknown as JobRow[];
      }
    } catch (e) {
      console.error("[jobs] list error:", e instanceof Error ? e.message : e);
    }
  }
  const all = [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  return status ? all.filter((j) => j.status === status) : all;
}

/** Advance a job through the Day 4 state machine. Returns null when illegal. */
export async function transitionJob(jobId: string, to: string): Promise<JobRow | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data: cur } = await db.from("jobs").select("status").eq("id", jobId).single();
        const from = (cur as { status: string } | null)?.status;
        if (!from || !(TRANSITIONS[from] ?? []).includes(to)) return null;
        const { data, error } = await db.from("jobs").update({ status: to }).eq("id", jobId).select("*").single();
        if (!error && data) {
          await appendEvent(jobId, to, { from });
          return data as unknown as JobRow;
        }
        return null;
      }
    } catch (e) {
      console.error("[jobs] transition error:", e instanceof Error ? e.message : e);
      return null;
    }
  }
  const mem = getMemoryJob(jobId);
  if (!mem || !(TRANSITIONS[mem.status] ?? []).includes(to)) return null;
  const from = mem.status;
  mem.status = to;
  const list = events.get(jobId) ?? [];
  list.push({ id: randomUUID(), job_id: jobId, kind: to, payload: { from }, createdAt: Date.now() });
  events.set(jobId, list);
  return mem;
}

/** Record a verification verdict; on pass the caller completes + captures payment. */
export async function saveVerifyResult(jobId: string, verdict: unknown): Promise<void> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        await db.from("jobs").update({ verify_result: verdict }).eq("id", jobId);
        return;
      }
    } catch (e) {
      console.error("[jobs] verify save error:", e instanceof Error ? e.message : e);
    }
  }
  const mem = getMemoryJob(jobId);
  if (mem) mem.verify_result = verdict;
}
