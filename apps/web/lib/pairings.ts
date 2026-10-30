import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";

export type PairingStatus = "waiting" | "phone_connected" | "glasses_ready" | "claimed" | "expired";

export interface GlassesPairing {
  id: string;
  userId: string;
  status: PairingStatus;
  deviceLabel: string | null;
  createdAt: number;
  expiresAt: number;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // unambiguous, no 0/O/1/I/L
const CODE_TTL_MS = 10 * 60 * 1000;

const gs = globalThis as unknown as {
  __tasklens_pairings?: Map<string, { row: GlassesPairing; hash: string }>;
};
const pairings = (gs.__tasklens_pairings ??= new Map<string, { row: GlassesPairing; hash: string }>());

export function hashPairingCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

function genCode(): string {
  const buf = randomBytes(6);
  return Array.from(buf)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
}

/** Test helper. */
export function __clearPairings(): void {
  pairings.clear();
}

function isLive(p: GlassesPairing, now = Date.now()): boolean {
  return (p.status === "waiting" || p.status === "phone_connected" || p.status === "glasses_ready") && p.expiresAt > now;
}

function rowFromDb(r: unknown): GlassesPairing {
  const x = r as Record<string, unknown>;
  return {
    id: String(x.id),
    userId: String(x.user_id ?? ""),
    status: (x.status as PairingStatus) ?? "waiting",
    deviceLabel: (x.device_label as string) ?? null,
    createdAt: x.created_at ? Date.parse(String(x.created_at)) : Date.now(),
    expiresAt: x.expires_at ? Date.parse(String(x.expires_at)) : Date.now(),
  };
}

/** Create a pairing for the signed-in user. Returns the code ONCE (hash only in DB). */
export async function createPairing(userId: string): Promise<{ pairing: GlassesPairing; code: string }> {
  const code = genCode();
  const hash = hashPairingCode(code);
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        // One live pairing per user: expire the old ones.
        await db.from("glasses_pairings").update({ status: "expired" }).eq("user_id", userId).in("status", ["waiting", "phone_connected", "glasses_ready"]);
        const { data, error } = await db
          .from("glasses_pairings")
          .insert({ user_id: userId, code_hash: hash, status: "waiting", expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString() })
          .select("*")
          .single();
        if (!error && data) return { pairing: rowFromDb(data), code };
        console.error("[pairings] insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[pairings] error:", e instanceof Error ? e.message : e);
    }
  }
  for (const [id, p] of pairings) {
    if (p.row.userId === userId && isLive(p.row)) {
      p.row.status = "expired";
      pairings.set(id, p);
    }
  }
  const row: GlassesPairing = {
    id: randomUUID(),
    userId,
    status: "waiting",
    deviceLabel: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + CODE_TTL_MS,
  };
  pairings.set(row.id, { row, hash });
  return { pairing: row, code };
}

export async function getPairing(id: string): Promise<GlassesPairing | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("glasses_pairings").select("*").eq("id", id).single();
        if (data) return rowFromDb(data);
      }
    } catch (e) {
      console.error("[pairings] get error:", e instanceof Error ? e.message : e);
    }
  }
  return pairings.get(id)?.row ?? null;
}

/**
 * Companion app claims a code (single use: waiting -> phone_connected).
 * Returns null when the code is unknown, expired or already used.
 */
export async function claimPairing(code: string, deviceLabel: string): Promise<GlassesPairing | null> {
  const hash = hashPairingCode(code);
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db
          .from("glasses_pairings")
          .update({ status: "phone_connected", device_label: deviceLabel.slice(0, 120) })
          .eq("code_hash", hash)
          .eq("status", "waiting")
          .gt("expires_at", new Date().toISOString())
          .select("*")
          .single();
        if (!error && data) return rowFromDb(data);
        return null;
      }
    } catch (e) {
      console.error("[pairings] claim error:", e instanceof Error ? e.message : e);
      return null;
    }
  }
  for (const [, p] of pairings) {
    if (p.hash === hash && p.row.status === "waiting" && p.row.expiresAt > Date.now()) {
      p.row.status = "phone_connected";
      p.row.deviceLabel = deviceLabel.slice(0, 120);
      return p.row;
    }
  }
  return null;
}

/** Companion reports glasses linked (phone_connected -> glasses_ready). */
export async function markGlassesReady(code: string): Promise<GlassesPairing | null> {
  const hash = hashPairingCode(code);
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db
          .from("glasses_pairings")
          .update({ status: "glasses_ready" })
          .eq("code_hash", hash)
          .eq("status", "phone_connected")
          .gt("expires_at", new Date().toISOString())
          .select("*")
          .single();
        if (!error && data) return rowFromDb(data);
        return null;
      }
    } catch (e) {
      console.error("[pairings] ready error:", e instanceof Error ? e.message : e);
      return null;
    }
  }
  for (const [, p] of pairings) {
    if (p.hash === hash && p.row.status === "phone_connected" && p.row.expiresAt > Date.now()) {
      p.row.status = "glasses_ready";
      return p.row;
    }
  }
  return null;
}
