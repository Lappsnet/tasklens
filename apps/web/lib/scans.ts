import { randomUUID } from "node:crypto";
import { AiSpec, type AiSpec as AiSpecType } from "@tasklens/ai";
import { hasSupabase, serviceClient } from "./supabase-server";

export interface StoredScan {
  scanId: string;
  spec: AiSpec;
  transcript: string;
  lang: string;
  photoCount: number;
  /** First photo data URL (memory only, ≤1.5 MB) so Day 5 verification has a "before". */
  photoDataUrl?: string;
  createdAt: number;
}

/** Dev/demo fallback store so scan -> quote works with no Supabase configured. */
const mem = new Map<string, StoredScan>();

export function saveMemoryScan(s: Omit<StoredScan, "scanId" | "createdAt">): StoredScan {
  // Bound stored photo size: memory fallback only, never persisted to DB.
  const row: StoredScan = { ...s, scanId: randomUUID(), createdAt: Date.now() };
  if (row.photoDataUrl && row.photoDataUrl.length > 1_500_000) delete row.photoDataUrl;
  mem.set(row.scanId, row);
  // Bound memory: keep last 200 scans.
  if (mem.size > 200) {
    const first = mem.keys().next().value;
    if (first) mem.delete(first);
  }
  return row;
}

export function getMemoryScan(id: string): StoredScan | undefined {
  return mem.get(id);
}

/** Load a scan's validated spec (memory or Supabase). Null when missing/invalid. */
export async function getScanSpec(id: string): Promise<AiSpecType | null> {
  const mem = getMemoryScan(id);
  if (mem) return mem.spec;
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("scans").select("ai_spec").eq("id", id).single();
        if (data) {
          const parsed = AiSpec.safeParse((data as { ai_spec: unknown }).ai_spec);
          if (parsed.success) return parsed.data;
        }
      }
    } catch (e) {
      console.error("[scans] spec read error:", e instanceof Error ? e.message : e);
    }
  }
  return null;
}
