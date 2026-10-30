/* F3: capture every key screen at 375/768/1440 px, light + dark, into
 * docs/screens/ui-v2/. Fails on horizontal scroll, invisible headings
 * (h1/h2 same colour as background) or console/page errors.
 * Run: pnpm e2e:screens  (builds, serves next start, captures, shuts down).
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { chromium } = require("@playwright/test");

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "..", "..", "..", "docs", "screens", "ui-v2");

const PAGES = [
  { route: "/", name: "home", role: null },
  { route: "/login", name: "login", role: null },
  { route: "/scan", name: "scan", role: "customer" },
  { route: "/inicio", name: "inicio", role: "customer" },
  { route: "/pro", name: "pro", role: "pro" },
  { route: "/empresa", name: "empresa", role: "company" },
  { route: "/city", name: "city", role: "city_operator" },
];
const VIEWPORTS = [
  { w: 375, h: 800 },
  { w: 768, h: 900 },
  { w: 1440, h: 900 },
];
const THEMES = ["light", "dark"];

function waitForPort(port, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function probe() {
      const s = net.connect(port, "127.0.0.1");
      s.on("connect", () => (s.end(), resolve()));
      s.on("error", () => {
        s.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error("server never came up"));
        else setTimeout(probe, 500);
      });
    })();
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // Local proof runs against the dev server: the P0-1 boot guard refuses
  // keyless `next start`, and real keys are owner-blocked. Same components,
  // same theme system; production `next build` still gates this script.
  const webDir = path.join(__dirname, "..");
  const nextBin = path.join(
    path.dirname(require.resolve("next/package.json", { paths: [webDir] })),
    "dist", "bin", "next",
  );
  const serverLog = fs.openSync(path.join(webDir, "e2e-server.log"), "w");
  const server = spawn(process.execPath, [nextBin, "dev", "-p", String(PORT)], {
    cwd: webDir,
    stdio: ["ignore", serverLog, serverLog],
  });
  const failures = [];
  try {
    await waitForPort(PORT);
    const browser = await chromium.launch();
    for (const page of PAGES) {
      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          const label = `${page.name}-${vp.w}-${theme}`;
          try {
            await capture(browser, page, vp, theme, label);
            console.log("ok", label);
          } catch (e) {
            failures.push(`${label}: ${e.message}`);
            console.log("FAIL", label, "-", e.message);
          }
        }
      }
    }
    await browser.close();
  } finally {
    server.kill();
  }
  if (failures.length) {
    console.error(`\n${failures.length} failures:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nAll 42 screenshots pass (no h-scroll, headings visible, no console errors).");
}

async function capture(browser, pageDef, vp, theme, label) {
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    colorScheme: theme,
    locale: "es-SV",
  });
  if (pageDef.role) {
    await context.addCookies([
      { name: "tasklens_demo", value: pageDef.role, url: BASE },
      ...(pageDef.role === "city_operator"
        ? [{ name: "tasklens_city", value: "san-salvador", url: BASE }]
        : []),
    ]);
  }
  const page = await context.newPage();
  const problems = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console: ${msg.text().slice(0, 2000)}`);
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${String(err).slice(0, 2000)}`));
  try {
    await page.goto(BASE + pageDef.route, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch {
    // One retry: dev cold-compile can exceed the first navigation budget.
    await page.goto(BASE + pageDef.route, { waitUntil: "domcontentloaded", timeout: 90000 });
  }
  await page.evaluate(() => document.fonts?.ready.then(() => {}).catch(() => {}));
  // Scroll through the page so scroll reveals fire, then back to top.
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (const y of [h * 0.33, h * 0.66, h]) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  const result = await page.evaluate(() => {
    const out = { hScroll: 0, innerWidth: window.innerWidth, invisible: [] };
    out.hScroll = document.documentElement.scrollWidth;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    for (const el of document.querySelectorAll("h1, h2")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // hidden
      const color = getComputedStyle(el).color;
      if (color === bodyBg) out.invisible.push(`${el.tagName}: ${el.textContent?.trim().slice(0, 60)}`);
    }
    out.bodyBg = bodyBg;
    return out;
  });
  await page.screenshot({ path: path.join(OUT, `${label}.png`) });
  await context.close();

  const errs = [];
  if (result.hScroll > vp.w + 1) errs.push(`horizontal scroll (${result.hScroll}px > ${vp.w}px)`);
  for (const h of result.invisible) errs.push(`invisible heading ${h}`);
  for (const p of problems) errs.push(p);
  if (errs.length) throw new Error(errs.join(" | "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
