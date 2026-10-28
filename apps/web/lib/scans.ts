import { randomUUID } from "node:crypto";
import type { AiSpec } from "@tasklens/ai";

export interface StoredScan {
  scanId: string;
  spec: AiSpec;
  transcript: string;
  lang: string;
  photoCount: number;
  createdAt: number;
}

/** Dev/demo fallback store so scan -> quote works with no Supabase configured. */
const mem = new Map<string, StoredScan>();

export function saveMemoryScan(s: Omit<StoredScan, "scanId" | "createdAt">): StoredScan {
  const row: StoredScan = { ...s, scanId: randomUUID(), createdAt: Date.now() };
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
