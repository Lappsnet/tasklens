/**
 * P0-5: Digital Asset Links statement for the Trusted Web Activity.
 * The Play app-signing SHA-256 fingerprints come from
 * ASSETLINKS_SHA256_FINGERPRINTS (comma-separated, set after the Play
 * Console generates the signing key). Unset → null (route answers 404,
 * so we never publish a half-valid statement).
 */
export interface AssetLinkStatement {
  relation: string[];
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
}

export function buildAssetLinks(): AssetLinkStatement[] | null {
  const raw = (process.env.ASSETLINKS_SHA256_FINGERPRINTS ?? "").trim();
  if (!raw) return null;
  const prints = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (prints.length === 0 || !prints.every((p) => /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(p))) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.tasklens.app",
        sha256_cert_fingerprints: prints,
      },
    },
  ];
}
