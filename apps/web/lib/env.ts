/** Central environment helpers. Production must never run in demo/mock mode. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** True when the app may use demo/mock paths (local dev or tests only). */
export function demoAllowed(): boolean {
  if (isProduction()) return false;
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return true;
}

/** Alias used at API boundaries: mock AI/storage paths only when demo is allowed. */
export const demoMode = demoAllowed;

/** Fail fast at boot when production is misconfigured (P0-1). */
export function assertProdEnv(): void {
  if (!isProduction()) return;
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  if (!process.env.MODEL_API_KEY) missing.push("MODEL_API_KEY");
  if (missing.length > 0) {
    throw new Error(`[tasklens] production boot refused: missing ${missing.join(", ")}`);
  }
}
