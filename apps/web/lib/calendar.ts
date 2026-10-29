import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";

export interface CalBlock {
  id: string;
  pro_id?: string;
  user_id?: string;
  starts_at: string;
  ends_at: string;
  kind: "busy" | "recurring" | "buffer" | "zone";
  note: string;
}

const gs = globalThis as unknown as { __tasklens_blocks?: Map<string, CalBlock[]> };
const blocks = (gs.__tasklens_blocks ??= new Map<string, CalBlock[]>());
const g2 = globalThis as unknown as {
  __tasklens_feedrec?: Map<string, { userId: string; revoked: boolean }>;
  __tasklens_feedtok?: Map<string, string>;
};
// Feed secrets must also survive module duplication (see stores note below).
const feeds = (g2.__tasklens_feedrec ??= new Map<string, { userId: string; revoked: boolean }>()); // hash -> record
const feedTokens = (g2.__tasklens_feedtok ??= new Map<string, string>()); // userId -> full token (demo only; shown once)

function key(userId?: string, proId?: string): string {
  return `${userId ?? ""}|${proId ?? ""}`;
}

export async function listBlocks(userId?: string, proId?: string): Promise<CalBlock[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        let q = db.from("calendar_blocks").select("*").order("starts_at", { ascending: true }).limit(200);
        if (userId) q = q.eq("user_id", userId);
        if (proId) q = q.eq("pro_id", proId);
        const { data, error } = await q;
        if (!error && data) return data as unknown as CalBlock[];
      }
    } catch (e) {
      console.error("[calendar] read error:", e instanceof Error ? e.message : e);
    }
  }
  const all = blocks.get(key(userId, proId)) ?? [];
  const mine = [...blocks.values()].flat();
  const scoped = userId || proId ? mine.filter((b) => (!userId || b.user_id === userId) && (!proId || b.pro_id === proId)) : all;
  return scoped.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function addBlock(b: Omit<CalBlock, "id">): Promise<CalBlock> {
  const row: CalBlock = { ...b, id: randomUUID() };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("calendar_blocks").insert(row).select("*").single();
        if (!error && data) return data as unknown as CalBlock;
        console.error("[calendar] insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[calendar] insert error:", e instanceof Error ? e.message : e);
    }
  }
  const k = key(row.user_id, row.pro_id);
  const list = blocks.get(k) ?? [];
  list.push(row);
  blocks.set(k, list);
  return row;
}

export async function removeBlock(id: string): Promise<boolean> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { error } = await db.from("calendar_blocks").delete().eq("id", id);
        if (!error) return true;
      }
    } catch (e) {
      console.error("[calendar] delete error:", e instanceof Error ? e.message : e);
    }
  }
  for (const [k, list] of blocks) {
    const ix = list.findIndex((b) => b.id === id);
    if (ix >= 0) {
      list.splice(ix, 1);
      blocks.set(k, list);
      return true;
    }
  }
  return false;
}

// --- ICS feeds: random 32-byte tokens, only SHA-256 stored ---

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function mintFeedToken(userId: string): Promise<{ token: string; mock: boolean }> {
  const token = randomBytes(32).toString("hex");
  const hash = hashToken(token);
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { error } = await db.from("calendar_feeds").insert({ user_id: userId, token_hash: hash });
        if (!error) return { token, mock: false };
        console.error("[calendar] feed insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[calendar] feed error:", e instanceof Error ? e.message : e);
    }
  }
  feeds.set(hash, { userId, revoked: false });
  feedTokens.set(userId, token);
  return { token, mock: true };
}

export async function resolveFeedToken(token: string): Promise<string | null> {
  const hash = hashToken(token);
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("calendar_feeds").select("user_id,revoked").eq("token_hash", hash).single();
        const row = data as { user_id: string; revoked: boolean } | null;
        if (row && !row.revoked) return row.user_id;
        return null;
      }
    } catch (e) {
      console.error("[calendar] feed resolve error:", e instanceof Error ? e.message : e);
    }
  }
  const rec = feeds.get(hash);
  return rec && !rec.revoked ? rec.userId : null;
}

export async function revokeFeedToken(userId: string): Promise<void> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) await db.from("calendar_feeds").update({ revoked: true }).eq("user_id", userId);
    } catch (e) {
      console.error("[calendar] revoke error:", e instanceof Error ? e.message : e);
    }
  }
  for (const [h, r] of feeds) if (r.userId === userId) feeds.set(h, { ...r, revoked: true });
  feedTokens.delete(userId);
}

/** Minimal ICS for a job (used by the feed and booking confirmations). */
export function jobToIcs(args: { id: string; title: string; slot: string; durationH?: number; description?: string }): string {
  const start = new Date(args.slot);
  const end = new Date(start.getTime() + (args.durationH ?? 2) * 3600_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TaskLens//Jobs//EN",
    "BEGIN:VEVENT",
    `UID:${args.id}@tasklens`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(args.title)}`,
    `DESCRIPTION:${esc(args.description ?? "TaskLens job")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
