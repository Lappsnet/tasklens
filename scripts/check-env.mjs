#!/usr/bin/env node
/* Check which env vars are present (names only, never values).
 * Usage: node scripts/check-env.mjs [--prod]
 * --prod = require production set (Supabase + MODEL_API_KEY, forbid DEMO_MODE).
 */
import fs from "node:fs";
import path from "node:path";

const prod = process.argv.includes("--prod");
const root = new URL("../", import.meta.url).pathname;
const candidates = [
  path.join(new URL("../", import.meta.url).pathname, ".env"),
  path.join(root, "..", ".env"),
  "C:\\Users\\Jhonny\\tasklens\\apps\\web\\.env.local",
  "C:\\Users\\Jhonny\\tasklens\\.env",
];
let fileVars = {};
for (const f of candidates) {
  try {
    if (!fs.existsSync(f)) continue;
    const txt = fs.readFileSync(f, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[2].trim() !== "") fileVars[m[1]] = "file";
    }
  } catch { /* ignore */ }
}
const env = { ...fileVars };
for (const k of Object.keys(process.env)) {
  if (/^[A-Z][A-Z0-9_]*$/.test(k) && process.env[k]) env[k] = env[k] ?? "shell";
}

const requiredProd = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MODEL_API_KEY"];
const recommended = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY", "STORAGE_BUCKET",
  "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID", "PAYPAL_ENV",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID", "NEXT_PUBLIC_MAPBOX_TOKEN", "NEXT_PUBLIC_APP_URL",
  "DEMO_CUSTOMER_EMAIL", "DEMO_CUSTOMER_PASSWORD", "DEMO_PRO_EMAIL", "DEMO_PRO_PASSWORD",
];
let fail = 0;
console.log(`mode: ${prod ? "production" : "local"}`);
for (const k of requiredProd) {
  const ok = Boolean(env[k]);
  console.log(`${ok ? "OK     " : "MISSING"} ${k}${prod && !ok ? "  <-- blocks prod boot" : ""}`);
  if (prod && !ok) fail++;
}
console.log("--- recommended ---");
for (const k of recommended) {
  console.log(`${env[k] ? "OK     " : "MISSING"} ${k}`);
}
if (prod && process.env.DEMO_MODE) {
  console.log("WARN DEMO_MODE is set in prod (must be unset)");
  fail++;
}
process.exit(fail ? 1 : 0);
