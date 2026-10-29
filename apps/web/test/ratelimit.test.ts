import { describe, expect, it } from "vitest";
import { clientKey, rateLimit } from "../lib/ratelimit";

describe("rateLimit (API hardening)", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test-${Date.now()}-a`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 60_000)).toBe(true);
    expect(rateLimit(key, 5, 60_000)).toBe(false);
  });

  it("resets after the window passes", async () => {
    const key = `test-${Date.now()}-b`;
    expect(rateLimit(key, 1, 20)).toBe(true);
    expect(rateLimit(key, 1, 20)).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(rateLimit(key, 1, 20)).toBe(true);
  });

  it("uses independent buckets per key", () => {
    const a = `test-${Date.now()}-c1`;
    const b = `test-${Date.now()}-c2`;
    expect(rateLimit(a, 1, 60_000)).toBe(true);
    expect(rateLimit(a, 1, 60_000)).toBe(false);
    expect(rateLimit(b, 1, 60_000)).toBe(true);
  });
});

describe("clientKey", () => {
  it("prefers x-forwarded-for", () => {
    const req = new Request("http://x/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientKey(req)).toBe("1.2.3.4");
  });

  it("falls back to a shared bucket without proxy headers", () => {
    expect(clientKey(new Request("http://x/"))).toBe("local");
  });
});
