import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";

export interface PassportEntry {
  id: string;
  home_id: string;
  job_id: string;
  category: string;
  title: string;
  before_photo?: string;
  after_photo?: string;
  contract_id?: string;
  materials: string[];
  pro_id?: string;
  warranty_until?: string;
  ai_summary: string;
  createdAt: number;
}

export interface ReminderRow {
  id: string;
  home_id: string;
  entry_id?: string;
  title: string;
  due_on: string;
  done: boolean;
}

export interface HomeRow {
  id: string;
  owner_id?: string;
  label: string;
}

const gs = globalThis as unknown as {
  __tasklens_homes?: Map<string, HomeRow>;
  __tasklens_entries?: Map<string, PassportEntry[]>;
  __tasklens_reminders?: Map<string, ReminderRow[]>;
  __tasklens_shares?: Map<string, { homeId: string; exp: number; revoked: boolean }>;
};
const homes = (gs.__tasklens_homes ??= new Map<string, HomeRow>());
const entries = (gs.__tasklens_entries ??= new Map<string, PassportEntry[]>());
const reminders = (gs.__tasklens_reminders ??= new Map<string, ReminderRow[]>());
const shares = (gs.__tasklens_shares ??= new Map<string, { homeId: string; exp: number; revoked: boolean }>());

const HOME_KEY = "default";

export async function getOrCreateHome(ownerId?: string): Promise<HomeRow> {
  const key = ownerId ?? HOME_KEY;
  if (hasSupabase() && ownerId) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("homes").select("*").eq("owner_id", ownerId).limit(1).single();
        if (data) return data as unknown as HomeRow;
        const { data: created, error } = await db.from("homes").insert({ owner_id: ownerId, label: "Mi hogar" }).select("*").single();
        if (!error && created) return created as unknown as HomeRow;
      }
    } catch (e) {
      console.error("[passport] home error:", e instanceof Error ? e.message : e);
    }
  }
  const found = homes.get(key);
  if (found) return found;
  const row: HomeRow = { id: randomUUID(), owner_id: ownerId, label: "Mi hogar" };
  homes.set(key, row);
  return row;
}

export async function addEntry(e: Omit<PassportEntry, "id" | "createdAt">): Promise<PassportEntry> {
  const row: PassportEntry = { ...e, id: randomUUID(), createdAt: Date.now() };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("passport_entries").insert(row).select("*").single();
        if (!error && data) return data as unknown as PassportEntry;
        console.error("[passport] entry insert failed:", error?.message);
      }
    } catch (err) {
      console.error("[passport] entry error:", err instanceof Error ? err.message : err);
    }
  }
  const list = entries.get(row.home_id) ?? [];
  list.push(row);
  entries.set(row.home_id, list);
  return row;
}

export async function listEntries(homeId: string): Promise<PassportEntry[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("passport_entries").select("*").eq("home_id", homeId).order("created_at", { ascending: false });
        if (!error && data) return data as unknown as PassportEntry[];
      }
    } catch (e) {
      console.error("[passport] list error:", e instanceof Error ? e.message : e);
    }
  }
  return entries.get(homeId) ?? [];
}

export async function addReminder(r: Omit<ReminderRow, "id">): Promise<ReminderRow> {
  const row: ReminderRow = { ...r, id: randomUUID() };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("reminders").insert({ home_id: r.home_id, entry_id: r.entry_id, title: r.title, due_on: r.due_on }).select("*").single();
        if (!error && data) return data as unknown as ReminderRow;
      }
    } catch (e) {
      console.error("[passport] reminder error:", e instanceof Error ? e.message : e);
    }
  }
  const list = reminders.get(row.home_id) ?? [];
  list.push(row);
  reminders.set(row.home_id, list);
  return row;
}

export async function listReminders(homeId: string): Promise<ReminderRow[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("reminders").select("*").eq("home_id", homeId).eq("done", false).order("due_on", { ascending: true });
        if (data) return data as unknown as ReminderRow[];
      }
    } catch (e) {
      console.error("[passport] reminders error:", e instanceof Error ? e.message : e);
    }
  }
  return (reminders.get(homeId) ?? []).filter((r) => !r.done);
}

export async function completeReminder(homeId: string, id: string, done = true): Promise<void> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) await db.from("reminders").update({ done }).eq("id", id);
    } catch (e) {
      console.error("[passport] reminder update error:", e instanceof Error ? e.message : e);
    }
  }
  const list = reminders.get(homeId) ?? [];
  const r = list.find((x) => x.id === id);
  if (r) r.done = done;
}

/** Share link: token shown once, only SHA-256 stored, 30-day expiry. */
export async function mintShareLink(homeId: string): Promise<{ url: string; mock: boolean }> {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        await db.from("passport_shares").insert({
          home_id: homeId,
          token_hash: hash,
          expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
        });
        const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
        return { url: `${base}/passport/shared/${token}`, mock: false };
      }
    } catch (e) {
      console.error("[passport] share error:", e instanceof Error ? e.message : e);
    }
  }
  shares.set(hash, { homeId, exp: Date.now() + 30 * 86400_000, revoked: false });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { url: `${base}/passport/shared/${token}`, mock: true };
}

export async function resolveShare(token: string): Promise<string | null> {
  const hash = createHash("sha256").update(token).digest("hex");
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("passport_shares").select("home_id,expires_at,revoked").eq("token_hash", hash).single();
        const row = data as { home_id: string; expires_at: string; revoked: boolean } | null;
        if (row && !row.revoked && new Date(row.expires_at) > new Date()) return row.home_id;
        return null;
      }
    } catch (e) {
      console.error("[passport] share resolve error:", e instanceof Error ? e.message : e);
    }
  }
  const rec = shares.get(hash);
  return rec && !rec.revoked && rec.exp > Date.now() ? rec.homeId : null;
}
