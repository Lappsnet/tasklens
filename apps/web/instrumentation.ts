/** Next.js boot hook: refuse to serve production traffic when misconfigured. */
export async function register() {
  const { assertProdEnv } = await import("./lib/env");
  assertProdEnv();
}
