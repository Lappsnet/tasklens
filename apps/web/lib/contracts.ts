import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";
import type { ContractDraft } from "@tasklens/ai";

export interface ContractRow {
  id: string;
  job_id: string;
  status: "draft" | "partially_signed" | "fully_signed" | "voided";
  title: string;
  body_es: string;
  body_en: string;
  summary_es: string;
  summary_en: string;
  price_usd: number;
  warranty_days: number;
  pdf_path?: string;
  pdf_sha256?: string;
}

export interface SignatureRow {
  id: string;
  contract_id: string;
  role: "customer" | "pro";
  signer_name: string;
  signature_png: string;
  email: string;
  signed_at: number;
}

export interface ChangeOrderRow {
  id: string;
  contract_id: string;
  description: string;
  scope_delta: string;
  price_delta_usd: number;
  time_delta_hours: number;
  status: "proposed" | "approved" | "rejected";
  orderId?: string;
  authorizationId?: string;
}

const gs = globalThis as unknown as {
  __tasklens_contracts?: Map<string, ContractRow>;
  __tasklens_signatures?: Map<string, SignatureRow[]>;
  __tasklens_changes?: Map<string, ChangeOrderRow[]>;
  __tasklens_signcodes?: Map<string, { code: string; exp: number }>;
};
const contracts = (gs.__tasklens_contracts ??= new Map<string, ContractRow>());
const signatures = (gs.__tasklens_signatures ??= new Map<string, SignatureRow[]>());
const changes = (gs.__tasklens_changes ??= new Map<string, ChangeOrderRow[]>());
const signCodes = (gs.__tasklens_signcodes ??= new Map<string, { code: string; exp: number }>());

/** Demo-mode email codes (real mode uses Supabase OTP instead). */
export function issueSignCode(contractId: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  signCodes.set(contractId, { code, exp: Date.now() + 10 * 60_000 });
  return code;
}

export function checkSignCode(contractId: string, code: string): boolean {
  const rec = signCodes.get(contractId);
  if (!rec || rec.exp < Date.now()) return false;
  return rec.code === code;
}

export function sha256Hex(s: string | Uint8Array): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function saveContract(c: Omit<ContractRow, "id"> & { id?: string }): Promise<ContractRow> {
  const row: ContractRow = { ...c, id: c.id ?? randomUUID() };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("contracts").insert(row).select("*").single();
        if (!error && data) return data as unknown as ContractRow;
        console.error("[contracts] insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[contracts] error:", e instanceof Error ? e.message : e);
    }
  }
  contracts.set(row.id, row);
  return row;
}

export async function getContractByJob(jobId: string): Promise<ContractRow | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("contracts").select("*").eq("job_id", jobId).order("created_at", { ascending: false }).limit(1).single();
        if (data) return data as unknown as ContractRow;
      }
    } catch (e) {
      console.error("[contracts] read error:", e instanceof Error ? e.message : e);
    }
  }
  return [...contracts.values()].filter((c) => c.job_id === jobId).sort().pop() ?? null;
}

export async function getSignatures(contractId: string): Promise<SignatureRow[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("contract_signatures").select("*").eq("contract_id", contractId);
        if (data) return data as unknown as SignatureRow[];
      }
    } catch (e) {
      console.error("[contracts] sig read error:", e instanceof Error ? e.message : e);
    }
  }
  return signatures.get(contractId) ?? [];
}

export async function addSignature(s: Omit<SignatureRow, "id" | "signed_at"> & { ip?: string; userAgent?: string }): Promise<SignatureRow> {
  const row: SignatureRow = { ...s, id: randomUUID(), signed_at: Date.now() };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { error } = await db.from("contract_signatures").insert({
          contract_id: s.contract_id,
          role: s.role,
          signer_name: s.signer_name,
          signature_png: "(stored)",
          email: s.email,
        });
        if (error) console.error("[contracts] sig insert failed:", error.message);
        // Refresh status
        const sigs = await getSignatures(s.contract_id);
        const roles = new Set([...sigs.map((x) => x.role), s.role]);
        const status = roles.has("customer") && roles.has("pro") ? "fully_signed" : "partially_signed";
        await db.from("contracts").update({ status }).eq("id", s.contract_id);
        return row;
      }
    } catch (e) {
      console.error("[contracts] sig error:", e instanceof Error ? e.message : e);
    }
  }
  const list = signatures.get(s.contract_id) ?? [];
  if (!list.some((x) => x.role === s.role)) list.push(row);
  signatures.set(s.contract_id, list);
  const c = contracts.get(s.contract_id);
  if (c) {
    const roles = new Set(list.map((x) => x.role));
    c.status = roles.has("customer") && roles.has("pro") ? "fully_signed" : "partially_signed";
  }
  return row;
}

export async function getChanges(contractId: string): Promise<ChangeOrderRow[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("change_orders").select("*").eq("contract_id", contractId).order("created_at", { ascending: true });
        if (data) return data as unknown as ChangeOrderRow[];
      }
    } catch (e) {
      console.error("[contracts] change read error:", e instanceof Error ? e.message : e);
    }
  }
  return changes.get(contractId) ?? [];
}

export async function saveChangeOrder(c: Omit<ChangeOrderRow, "id"> & { id?: string }): Promise<ChangeOrderRow> {
  const row: ChangeOrderRow = { ...c, id: c.id ?? randomUUID() };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("change_orders").insert(row).select("*").single();
        if (!error && data) return data as unknown as ChangeOrderRow;
        console.error("[contracts] change insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[contracts] change error:", e instanceof Error ? e.message : e);
    }
  }
  const list = changes.get(row.contract_id) ?? [];
  const ix = list.findIndex((x) => x.id === row.id);
  if (ix >= 0) list[ix] = row;
  else list.push(row);
  changes.set(row.contract_id, list);
  return row;
}

export function contractFromDraft(jobId: string, draft: ContractDraft): Omit<ContractRow, "id"> {
  return {
    job_id: jobId,
    status: "draft",
    title: draft.title,
    body_es: draft.body_es,
    body_en: draft.body_en,
    summary_es: draft.summary_es,
    summary_en: draft.summary_en,
    price_usd: draft.price_usd,
    warranty_days: draft.warranty_days,
  };
}
