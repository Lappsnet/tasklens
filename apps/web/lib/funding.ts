import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";

export interface FundingLink {
  id: string;
  job_id: string;
  token: string;
  payer_email: string;
  status: string;
  expires_at: string;
}

const gs = globalThis as unknown as { __tasklens_funding?: Map<string, FundingLink & { hash: string }> };
const links = (gs.__tasklens_funding ??= new Map<string, FundingLink & { hash: string }>());

export async function createFundingLink(jobId: string): Promise<FundingLink> {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const row = {
    id: randomUUID(),
    job_id: jobId,
    token,
    payer_email: "",
    status: "open",
    expires_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
    hash,
  };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { error } = await db.from("funding_links").insert({ id: row.id, job_id: jobId, token_hash: hash, expires_at: row.expires_at });
        if (error) console.error("[funding] insert failed:", error.message);
      }
    } catch (e) {
      console.error("[funding] error:", e instanceof Error ? e.message : e);
    }
  }
  links.set(row.id, row);
  const { hash: _h, ...pub } = row;
  return pub as FundingLink;
}

export async function resolveFunding(token: string): Promise<(FundingLink & { jobTitle?: string; amountUsd?: number }) | null> {
  const hash = createHash("sha256").update(token).digest("hex");
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("funding_links").select("*").eq("token_hash", hash).single();
        const r = data as { id: string; job_id: string; payer_email: string; status: string; expires_at: string } | null;
        if (r && r.status === "open" && new Date(r.expires_at) > new Date()) {
          return { id: r.id, job_id: r.job_id, token, payer_email: r.payer_email, status: r.status, expires_at: r.expires_at };
        }
        return null;
      }
    } catch (e) {
      console.error("[funding] resolve error:", e instanceof Error ? e.message : e);
    }
  }
  const rec = [...links.values()].find((l) => l.hash === hash);
  if (!rec || rec.status !== "open" || new Date(rec.expires_at) < new Date()) return null;
  const { hash: _h, ...pub } = rec;
  return pub;
}

export async function markFundingUsed(id: string, payerEmail: string): Promise<void> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) await db.from("funding_links").update({ status: "used", payer_email: payerEmail }).eq("id", id);
    } catch (e) {
      console.error("[funding] update error:", e instanceof Error ? e.message : e);
    }
  }
  for (const [k, v] of links) if (v.id === id) links.set(k, { ...v, status: "used", payer_email: payerEmail });
}

export interface DisputeRow {
  id: string;
  job_id: string;
  raised_by: string;
  reason: string;
  status: string;
}

const dg = globalThis as unknown as {
  __tasklens_disputes?: Map<string, DisputeRow>;
  __tasklens_proposals?: Map<string, { id: string; dispute_id: string; kind: string; detail: string; amount_usd: number | null; created_by: string; accepted_by?: string; status: string }[]>;
};
const disputes = (dg.__tasklens_disputes ??= new Map<string, DisputeRow>());
const proposals = (dg.__tasklens_proposals ??= new Map<string, { id: string; dispute_id: string; kind: string; detail: string; amount_usd: number | null; created_by: string; accepted_by?: string; status: string }[]>());

export async function openDispute(jobId: string, raisedBy: string, reason: string): Promise<DisputeRow> {
  const row: DisputeRow = { id: randomUUID(), job_id: jobId, raised_by: raisedBy, reason, status: "open" };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("disputes").insert({ id: row.id, job_id: jobId, raised_by: raisedBy, reason }).select("*").single();
        if (!error && data) return data as unknown as DisputeRow;
      }
    } catch (e) {
      console.error("[disputes] insert error:", e instanceof Error ? e.message : e);
    }
  }
  disputes.set(row.id, row);
  return row;
}

export async function listDisputes(jobId: string): Promise<DisputeRow[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("disputes").select("*").eq("job_id", jobId).order("created_at", { ascending: false });
        if (data) return data as unknown as DisputeRow[];
      }
    } catch (e) {
      console.error("[disputes] read error:", e instanceof Error ? e.message : e);
    }
  }
  return [...disputes.values()].filter((d) => d.job_id === jobId);
}

export async function saveProposal(p: { dispute_id: string; kind: string; detail: string; amount_usd: number | null; created_by: string }): Promise<{ id: string } & typeof p & { status: string }> {
  const row = { ...p, id: randomUUID(), status: "pending" };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("dispute_proposals").insert(row).select("*").single();
        if (data) return data as unknown as typeof row;
      }
    } catch (e) {
      console.error("[disputes] proposal error:", e instanceof Error ? e.message : e);
    }
  }
  const list = proposals.get(p.dispute_id) ?? [];
  list.push(row as (typeof list)[number]);
  proposals.set(p.dispute_id, list);
  return row;
}

export async function listProposals(disputeId: string): Promise<{ id: string; dispute_id: string; kind: string; detail: string; amount_usd: number | null; status: string }[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("dispute_proposals").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true });
        if (data) return data as unknown as { id: string; dispute_id: string; kind: string; detail: string; amount_usd: number | null; status: string }[];
      }
    } catch (e) {
      console.error("[disputes] proposals read error:", e instanceof Error ? e.message : e);
    }
  }
  return (proposals.get(disputeId) ?? []).map(({ accepted_by: _a, created_by: _c, ...r }) => r);
}

export async function acceptProposal(disputeId: string, proposalId: string, by: string): Promise<boolean> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        await db.from("dispute_proposals").update({ status: "accepted", accepted_by: by }).eq("id", proposalId);
        await db.from("disputes").update({ status: "resolved" }).eq("id", disputeId);
        return true;
      }
    } catch (e) {
      console.error("[disputes] accept error:", e instanceof Error ? e.message : e);
    }
  }
  const list = proposals.get(disputeId) ?? [];
  const p = list.find((x) => x.id === proposalId);
  if (!p || p.status !== "pending") return false;
  p.status = "accepted";
  p.accepted_by = by;
  const d = disputes.get(disputeId);
  if (d) d.status = "resolved";
  return true;
}
