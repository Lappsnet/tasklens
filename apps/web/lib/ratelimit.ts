/**
 * Day 1: tiny in-memory sliding-window rate limiter for API routes.
 * Single-instance only (dev / single-region demo). Tighten with Redis post-demo.
 */
const gs = globalThis as unknown as { __tasklens_hits?: Map<string, number[]> };
const hits = (gs.__tasklens_hits ??= new Map<string, number[]>());

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = hits.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < windowMs);
  fresh.push(now);
  hits.set(key, fresh);
  return fresh.length <= limit;
}

export function clientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    // Next dev server has no direct IP on Request; fall back to a shared bucket.
    "local"
  );
}

/**
 * P0-1: Postgres-backed sliding window (works across serverless instances).
 * Falls back to the in-memory limiter when Supabase is unconfigured or the
 * RPC fails (fail-open locally, fail-closed never — availability first).
 */
export async function hitRateLimit(key: string, limit = 20, windowMs = 60_000): Promise<boolean> {
  try {
    const { serviceClient, hasSupabase } = await import("./supabase-server");
    if (hasSupabase()) {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.rpc("rate_limit_hit", {
          p_key: key,
          p_limit: limit,
          p_window_secs: Math.max(1, Math.round(windowMs / 1000)),
        });
        if (!error && typeof data === "boolean") return data;
        console.error("[ratelimit] rpc failed, using memory fallback:", error?.message);
      }
    }
  } catch (e) {
    console.error("[ratelimit] error, using memory fallback:", e instanceof Error ? e.message : e);
  }
  return rateLimit(key, limit, windowMs);
}
