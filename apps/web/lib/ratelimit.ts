/**
 * Day 2: tiny in-memory sliding-window rate limiter for API routes.
 * Single-instance only (dev / single-region demo). Tighten with Redis post-demo.
 */
const hits = new Map<string, number[]>();

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
