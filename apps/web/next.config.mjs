/** @type {import('next').NextConfig} */
const config = {
  // Keep @tasklens/ai as a real Node import (dist/): it reads prompt files
  // with fs + import.meta.url, which breaks when webpack bundles it.
  serverExternalPackages: ["@tasklens/ai"],
  // Security headers (incl. CSP) are set dynamically in middleware.ts so the
  // policy can reflect the configured backends and drop 'unsafe-eval' in prod.
};
export default config;
