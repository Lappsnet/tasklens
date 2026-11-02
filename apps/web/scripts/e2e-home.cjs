/* V0 stop-gap: capture home at 375 + 1440, light + dark only. */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { chromium } = require("@playwright/test");

const PORT = Number(process.env.E2E_PORT ?? 3101);
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "..", "..", "..", "docs", "screens", "ui-v3");

function waitForPort(port, timeoutMs = 90000) {
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
  // Local proof runs against the dev server (REUSE_SERVER=1 reuses a warm one:
  // start it once with `pnpm --filter web dev -- -p 3101`, then run batches).
  // The P0-1 boot guard refuses keyless `next start`; same components/theme.
  const webDir = path.join(__dirname, "..");
  const reuse = Boolean(process.env.REUSE_SERVER);
  let server = null;
  if (!reuse) {
    const nextBin = path.join(
      path.dirname(require.resolve("next/package.json", { paths: [webDir] })),
      "dist", "bin", "next",
    );
    const serverLog = fs.openSync(path.join(webDir, "e2e-home.log"), "w");
    server = spawn(process.execPath, [nextBin, "dev", "-p", String(PORT)], {
      cwd: webDir, stdio: ["ignore", serverLog, serverLog],
    });
  }
  try {
    await waitForPort(PORT, reuse ? 15000 : 90000);
    const browser = await chromium.launch();
    const allRoutes = ["/", "/scan", "/inicio", "/pro", "/empresa", "/city"];
    const routes = process.env.ROUTES ? process.env.ROUTES.split(",") : allRoutes;
    for (const route of routes) {
      const slug = route === "/" ? "home" : route.slice(1).replace(/\//g, "-");
    for (const w of [375, 1440]) {
      for (const theme of ["light", "dark"]) {
        for (const lang of ["es", "en"]) {
          if (route !== "/" && lang === "en") continue;
          const tag = `${slug}-${w}-${theme}${lang === "en" ? "-en" : ""}`;
          const page = await browser.newPage({ viewport: { width: w, height: 900 } });
          const errors = [];
          page.on("console", (m) => {
            const text = m.text();
            if (m.type() === "error" && !/status of 401/.test(text)) errors.push("console: " + text);
          });
          page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
          await page.context().addCookies([{ name: "tasklens:lang", value: lang, url: BASE }]);
          await page.goto(BASE + route, { waitUntil: "commit", timeout: 180000 });
          await page.waitForLoadState("domcontentloaded", { timeout: 180000 }).catch(() => {});
          await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          await page.waitForTimeout(4000);
          const h1 = await page.$eval("h1", (el) => {
            const c = getComputedStyle(el).color;
            const b = getComputedStyle(document.body).backgroundColor;
            return { c, b };
          }).catch(() => null);
          if (h1 && h1.c === h1.b) errors.push("h1 same colour as background");
          const probe = await page.evaluate(() => {
            const main = document.querySelector("main");
            const kids = main ? Array.from(main.children) : [];
            const base = document.documentElement.scrollWidth;
            const out = [];
            for (let i = 0; i < kids.length; i++) {
              const el = kids[i];
              el.style.display = "none";
              const w = document.documentElement.scrollWidth;
              if (w < base) out.push("section[" + i + "]: " + base + "->" + w);
              el.style.display = "";
            }
            return { base, inner: window.innerWidth, out };
          });
          if (probe.base > probe.inner + 1) errors.push("h-scroll w=" + probe.base + ": " + (probe.out.join(" | ") || "no single section"));
          await page.screenshot({ path: path.join(OUT, `${tag}.png`), animations: "disabled" });
          console.log(errors.length ? `FAIL ${tag} - ${errors.join(" | ")}` : `ok ${tag}`);
          await page.close();
        }
      }
    }
    }
    await browser.close();
  } finally {
    if (server) server.kill();
  }
}
main().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
