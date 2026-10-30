# TaskLens — Fix prompt: broken design, slow local dev, live jobs showcase (Oct 30)

Paste into your coding agent from the repo root. Do the blocks in order: F0 → F1 → F2 → F3 → F4.
Read `AGENTS.md` first. Do NOT start new features until F1 and F2 pass their checks.

---

## F0. Stabilise the working tree (10 min)
There are 8 uncommitted, half-converted U7 files (`(auth)/flow.tsx`, `book`, `contracts`,
`jobs`, `pro/calendar`, `pro/page`, `scan`, `globals.css`) plus an untracked test.
- Run typecheck + tests. If green, commit as `wip(u7): partial screen conversion`.
  If red, `git stash` them and continue from the last good commit (`f9af291`).
- Delete `apps/web/.next` once (it is 1.1 GB of stale dev cache).

---

## F1. Why the design looks broken — fix all of these

### F1.1 Dark mode makes all text invisible (the biggest visual bug)
`app/layout.tsx` imports `styles/tokens.css` and then `globals.css`. `globals.css` lines 7–19
redefine `--ink: #0F1B2D` in `:root`. `:root` and `[data-theme="dark"]` have the same
specificity, so the later file wins: in dark mode the page background becomes `#0A1220`
(dark) but `--ink` stays `#0F1B2D` (dark). Every text colour that uses `text-ink` disappears.
The theme defaults to the operating system, so any visitor with Windows/phone dark mode sees
a dark page with no readable text.
Fix:
- Delete the `:root { … }` block in `globals.css`. Tokens live ONLY in `tokens.css`.
- Keep legacy names as aliases defined in `tokens.css` that point at tokens
  (`--paper: var(--bg); --accent: var(--signal); --trust: var(--verified); --slate: var(--muted);`).
- Add a test page check: render `/` with `data-theme="dark"` and assert the computed colour
  of `h1` differs from the body background (Playwright, see F3).

### F1.2 Two smooth-scroll engines fight each other
`useLenis(true)` is called in `app/page.tsx:28` AND in `components/landing/HeroLens.tsx:42`:
two Lenis instances drive the same page, plus `html { scroll-behavior: smooth }` in
`globals.css`, which Lenis requires to be off. Result: jittery scroll, ScrollTrigger pins and
reveals firing at wrong positions, sections stuck invisible (opacity 0).
Fix:
- One `<SmoothScroll>` client component mounted once in the marketing layout; remove the
  call from `HeroLens`.
- Import `lenis/dist/lenis.css`; set `html.lenis, html.lenis body { height: auto; }` and remove
  `scroll-behavior: smooth` from `html`.
- After fonts and images load, call `ScrollTrigger.refresh()` once (`document.fonts.ready`).

### F1.3 Horizontal scroll and offset sections
The marketing pages are wrapped in `max-w-[1280px] px-4` (`components/site/SiteChrome.tsx`),
and the hero escapes it with `.full-bleed { width: 100vw; margin-left: calc(50% - 50vw) }`.
On Windows `100vw` includes the scrollbar, so the page scrolls sideways and sections shift.
Fix: marketing layout renders sections full width; each section has its own inner
`<Container>` (`mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8`). Delete `.full-bleed`.
Add `body { overflow-x: clip; }` as a safety net.

### F1.4 Scroll reveals leave content hidden or mis-positioned
`Reveal` (`components/landing/motion.tsx`) animates `from { opacity: 0, y: 28 }`. If the
trigger position is wrong (F1.2) content stays invisible; the leftover inline transform also
breaks `position: fixed` pins of children.
Fix: use `gsap.fromTo` with `clearProps: "transform,opacity"` on complete; set
`once: true`; never wrap a pinned/sticky section (`HowSteps`, `Theater`, `RaceSection`) in
`Reveal`; reveal only their headings. With reduced motion, render visible with no animation.

### F1.5 Language flash and a fully client-side landing page
`app/page.tsx` is `"use client"`, starts as `"es"`, then switches language in `useEffect`,
so English visitors see Spanish first and the whole landing ships as client JavaScript.
Fix: `page.tsx` becomes a Server Component that reads the `tasklens:lang` cookie (already set
by middleware) and passes the right content object down. Only interactive sections are client
islands (`HeroLens`, `Theater`, `RaceSection`, `HowSteps`, `DemoVideo`, `RoleTabs`, `FaqList`).

### F1.6 One layout for every kind of page
`SiteChrome` is a client component in the root layout that decides by pathname whether to show
the marketing header, nothing, or the `AppShell`. It loads all three for every page and causes
the wrong chrome to flash on navigation.
Fix (as `UI_UX_PROMPT.md` section 3 specified): route groups with their own server layouts:
`app/(marketing)/layout.tsx` (SiteHeader + SiteFooter + SmoothScroll),
`app/(auth)/layout.tsx` (bare split screen), `app/(app)/layout.tsx` (AppShell).
Move pages into the groups (URLs don't change). Delete `SiteChrome`.

### F1.7 It looks generic because there is no real imagery
The hero "photo" is an SVG drawing of a sink (`HeroLens.tsx:19`) and the feature theater has
no screenshots. Fix in F4 (real job photos) and by capturing real app screenshots for the
theater (`docs/screens/ui-v2/` → `public/images/screens/`).

### F1.8 Finish U7 consistently
Convert the remaining screens to the primitives; remove legacy classes (`.card`, `.btn`, `.seg`,
`.pill`, `.chip`, `.row`, `.lbl`, `.muted`, `.small`, `.badge`) and then delete the legacy block
in `globals.css`. A grep for `className="card` / `"btn` / `"muted` must return nothing.

---

## F2. Why local dev is slow — fix all of these

### F2.1 Middleware runs on every file and calls Supabase each time
`middleware.ts:81` uses `matcher: "/:path*"`, so it runs for every JS chunk, CSS file, font,
icon and image, and for each one it calls `sb.auth.getUser()`, a network round-trip to
Supabase. A single page load triggers dozens of these.
Fix:
```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|icons/|images/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|avif|svg|woff2)$).*)"],
};
```
and only refresh the Supabase session for page navigations and `/api/*` (skip prefetches:
`req.headers.get("next-router-prefetch")`). Security headers stay on all HTML/API responses.

### F2.2 Dev server uses webpack
Change `apps/web/package.json` → `"dev": "next dev --turbopack"`. Verify the
`serverExternalPackages: ["@tasklens/ai"]` setup still works under Turbopack; if not, log it
in `DECISIONS.md` and keep webpack.

### F2.3 Icon and UI barrel imports compile whole libraries
21 files import from the root of `@phosphor-icons/react` (thousands of icons × 6 weights),
plus `react-aria-components` and `motion/react`. Add to `next.config.mjs`:
```js
experimental: { optimizePackageImports: ["@phosphor-icons/react", "react-aria-components", "motion", "gsap"] },
```
In Server Components import icons from `@phosphor-icons/react/dist/ssr`.

### F2.4 Heavy animation code loads everywhere
GSAP, ScrollTrigger, SplitText and Lenis are imported at the top of every landing section, and
`SiteHeader` / `AppShell` import Motion on every route. After F1.6:
- Load GSAP-based sections with `next/dynamic` (client only), below-the-fold sections lazily.
- Mapbox (`components/map.tsx`) only via `next/dynamic` on the pages that show a map.

### F2.5 Duplicate session requests on every page
`SiteHeader.tsx:67` and `AppShell.tsx:75` both `fetch("/api/auth/me")` on mount, and
`AppShell` then fetches `/api/jobs`: two to three serial requests, each going through
middleware + Supabase, before the UI settles.
Fix: read the session once on the server in the group layout (`@supabase/ssr` cookies) and pass
`{ user, role }` as props; fetch job counts with React Query (cached, deduped).

### F2.6 Service worker active in development
`sw-register.js` registers `/sw.js` in every environment; the worker intercepts every
same-origin GET (including `/_next/` chunks) and caches navigations, which can serve stale pages
while developing.
Fix: register only when `process.env.NODE_ENV === "production"`; in `sw.js` return early for
`/_next/` and `/api/`; bump `VERSION`. Tell the owner to unregister the old worker once
(Chrome DevTools → Application → Service workers → Unregister, then hard reload).

### F2.7 Housekeeping
- `turbo.json` declares `"typecheck"` twice (the second silently drops `dependsOn`); keep one.
- Windows: add the repo folder to Microsoft Defender exclusions (owner action) — real-time
  scanning of `node_modules` and `.next` is a common cause of slow Next.js dev on Windows.

**Done for F2:** cold `pnpm dev` ready < 10 s; first load of `/` in dev < 4 s; navigating
between app pages < 1 s; production `next build && next start` Lighthouse performance ≥ 90 on
`/`. Record the before/after numbers in `PROGRESS.md`.

---

## F3. Prove it visually (do this after F1 and F2)
Add Playwright (`@playwright/test`, dev dependency) with a `pnpm --filter web e2e:screens`
script that starts `next start` and captures `/`, `/login`, `/scan`, `/inicio`, `/pro`,
`/empresa`, `/city` at 375, 768 and 1440 px in light AND dark theme into
`docs/screens/ui-v2/`. Fail the run if: the page scrolls horizontally, any `h1`/`h2` has
the same colour as its background, or the console shows errors. Show the owner the screenshots.

---

## F4. "Trabajos en vivo": jobs showcase with the owner's photos
Goal: the landing page (and `/alcaldias`) shows real-looking job cards so visitors see what
TaskLens handles: **Reportado → En progreso → Terminado**.

### Images
- Owner puts the downloaded photos in `apps/web/public/images/jobs/` (any names).
- Agent converts each to WebP and AVIF at 640 and 1280 px wide (`sharp`, dev dependency, in
  `scripts/optimize-images.ts`), strips EXIF/GPS metadata, and writes
  `content/showcase.ts` with one entry per photo. Before and after pairs share a `pairId`.
- Owner confirms for each photo that TaskLens may use it (own photo, or a licence that allows
  commercial use, e.g. Unsplash/Pexels). Record source + licence in `content/showcase.ts`.
  Photos with faces, licence plates or house numbers are blurred or not used.

### Data
```ts
type ShowcaseJob = {
  id: string;
  status: "reported" | "in_progress" | "done";
  category: "plumbing" | "electrical" | "appliance" | "drywall_paint" | "construction" | "assembly" | "cleaning" | "public_works";
  title: { es: string; en: string };          // e.g. "Fuga bajo el lavatrapos"
  place: { es: string; en: string };          // municipality only, e.g. "Santa Tecla" — never an address
  photo: string;                              // before / current photo
  afterPhoto?: string;                        // required when status = "done"
  progress?: number;                          // 0–100 for in_progress
  steps?: { es: string; en: string; done: boolean }[];
  priceRangeUsd?: [number, number];
  source: { kind: "own" | "licensed"; credit?: string; licence?: string };
};
```
Content only: no DB table needed for the landing. In the app, the same card component renders
real jobs from Supabase.

### UI
- **Landing section "Trabajos en vivo"** placed right after the hero:
  - Three filter tabs with counts: Reportados · En progreso · Terminados (React Aria Tabs).
  - Masonry/bento grid of cards. Each card: photo inside `Viewfinder` brackets, status chip
    (Reportado = blueprint blue, En progreso = signal orange with a pulsing dot, Terminado =
    verified green with the stamp seal), category icon, title, municipality, and:
    - Reportado: AI annotation callout on the photo ("Fuga activa", "$120–220").
    - En progreso: progress bar + current step ("Paso 3 de 5: cambiar el sifón").
    - Terminado: **before/after slider** (drag handle; keyboard arrows; touch) + "Verificado por IA".
  - Cards enter with a stagger; on desktop they tilt slightly toward the cursor.
  - Click opens a detail sheet with the full step list and the quote breakdown.
  - A clear label under the section title: **"Ejemplos de demostración"** /
    **"Demo examples"** while the content comes from `content/showcase.ts`. Remove the label
    only when the cards come from real completed jobs. Never present sample jobs as real
    customers, real reports or real statistics.
- **Hero integration:** The Lens uses the best "reported" photo instead of the SVG sink, with
  annotations positioned from `content/showcase.ts` (`annotations: {x, y, label}[]` in %).
- **Alcaldías page:** same cards filtered to `public_works`, on the department map.
- **App:** `/inicio` (customer) and `/empresa` reuse `JobCard` with real data.

**Done for F4:** section works at 375/768/1440 in both themes; slider usable by keyboard;
images served as AVIF/WebP with `next/image` `sizes`; LCP image is the hero photo with
`priority`; no CLS; all copy ES + EN.

---

## Rules
- One commit per sub-block (`fix(ui): …`, `perf(dev): …`, `feat(showcase): …`).
- Update `PROGRESS.md` with before/after timings and the screenshot paths.
- Ask the owner before adding any dependency not named here (`@playwright/test` and `sharp`
  are approved as dev dependencies).
