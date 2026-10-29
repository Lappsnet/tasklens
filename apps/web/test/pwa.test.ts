import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAssetLinks } from "../lib/assetlinks";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function pngBytes(p: string): Buffer {
  return readFileSync(join(ROOT, p));
}

describe("P0-5 PWA manifest + icons", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "public/manifest.webmanifest"), "utf8")) as {
    display: string;
    theme_color: string;
    background_color: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };

  it("uses the design-system colors and standalone display", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#0F1B2D");
    expect(manifest.background_color).toBe("#FAF7F2");
  });

  it("declares 192 + 512 + maskable icons that exist as real PNGs", () => {
    const bySize: Record<string, string[]> = {};
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith("/icons/")).toBe(true);
      const buf = pngBytes(`public${icon.src}`);
      expect(buf.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); // PNG magic
      (bySize[icon.sizes] ??= []).push(icon.purpose ?? "any");
    }
    expect(bySize["192x192"]).toContain("any");
    expect(bySize["512x512"]?.join(",")).toContain("any");
    expect(bySize["512x512"]?.join(",")).toContain("maskable");
  });

  it("ships a service worker with an offline fallback and an offline page", () => {
    const sw = readFileSync(join(ROOT, "public/sw.js"), "utf8");
    expect(sw).toContain("/offline");
    expect(existsSync(join(ROOT, "app/offline/page.tsx"))).toBe(true);
  });
});

describe("P0-5 assetlinks (TWA handshake)", () => {
  it("returns null when no fingerprints are configured (fails closed)", () => {
    delete process.env.ASSETLINKS_SHA256_FINGERPRINTS;
    expect(buildAssetLinks()).toBeNull();
  });

  it("builds a statement for com.tasklens.app with valid fingerprints", () => {
    process.env.ASSETLINKS_SHA256_FINGERPRINTS = `${"AB".padEnd(95, ":CD").slice(0, 95)}`;
    const st = buildAssetLinks();
    expect(st?.[0].target.package_name).toBe("com.tasklens.app");
    expect(st?.[0].relation).toContain("delegate_permission/common.handle_all_urls");
    delete process.env.ASSETLINKS_SHA256_FINGERPRINTS;
  });

  it("rejects malformed fingerprints", () => {
    process.env.ASSETLINKS_SHA256_FINGERPRINTS = "not-a-fingerprint";
    expect(buildAssetLinks()).toBeNull();
    delete process.env.ASSETLINKS_SHA256_FINGERPRINTS;
  });
});

describe("P0-5 privacy + terms coverage", () => {
  const privacy = readFileSync(join(ROOT, "app/privacy/page.tsx"), "utf8").toLowerCase();
  const terms = readFileSync(join(ROOT, "app/terms/page.tsx"), "utf8").toLowerCase();

  it("privacy covers camera, microphone, location, photos, PayPal, retention, deletion (ES+EN)", () => {
    for (const kw of ["cámara", "camera", "micrófono", "microphone", "ubicación", "location", "fotos", "photos", "paypal", "conserv", "retention", "elimin", "deletion"]) {
      expect(privacy, kw).toContain(kw);
    }
  });

  it("terms cover escrow, disputes, cancellation, liability (ES+EN)", () => {
    for (const kw of ["garantía", "escrow", "disputa", "dispute", "cancel", "responsabilidad", "liability"]) {
      expect(terms, kw).toContain(kw);
    }
  });
});
