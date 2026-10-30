# TaskLens — decisions

Record of stack/behavior decisions. Newest first. (AGENTS.md: docs beat this file on Meta API conflicts.)

## 2026-10-29 — U6 feature deep pages

- `/funciones/[slug]` statically generated for all 11 content chapters; mega-menu
  and theater link to them (anchors kept as fallback inside pages only).
- Cotización has no deep page (it lives inside the escaneo flow); the mega-menu
  carries Verificación instead, keeping the spec's 11 items.
- Visuals are blueprint-styled placeholders; owner screenshots swap in without
  touching page structure. YouTube-nocookie loads only on click (CSP unchanged).

## 2026-10-29 — U5 landing, rebuilt

- GSAP 3.15 + ScrollTrigger + SplitText (SplitText free since 3.13), Lenis
  1.3.27 — all transform/opacity-only, reduced-motion disables Lenis/pins/glides.
- Lens is 2D (SVG site drawing + clip-path AI layer + DOM annotations); the 3D
  glass-lens variant is cut per the spec's own cut order until Lighthouse is proven.
- Feature theater phone shows CSS-built mock screens (no screenshots exist yet —
  owner provides real screenshots/recordings; content files make the swap trivial).
- Demo block: empty provider until the owner sets NEXT_PUBLIC_DEMO_VIDEO_URL or
  the demoVideo config (CSP unchanged — no YouTube frame until then).
- Alcaldías map is a stylized dot-grid labeled illustrative (no fake geography);
  access form → 017 table, manual review.
- 3D lens variant cut; deep pages (U6) kept.

## 2026-10-29 — U4 app shell and role menus

- `015_companies.sql`: companies + company_members (owner/dispatcher/member),
  jobs.company_id, RLS (members read own company's jobs; writes via service
  role after dispatcher checks). `profiles_role_check` widened to company.
- `AppShell`: collapsible desktop sidebar (Motion layoutId active edge),
  topbar (breadcrumb, ⌘K palette, bell, user menu), mobile tab bar (≤4 tabs +
  raised center FAB + "Más" sheet), AnimatePresence route transitions.
- Role menus (nav.ts, tested live): customer Inicio/Mis trabajos/Pasaporte/…,
  pro Hoy/Calendario/…, empresa Panel/Equipo/…, alcaldía Tablero, admin queue.
  Only live routes; chat ("Mensajes") cut — no chat feature exists.
- New: `/inicio` (scan hero, active jobs, appointments, reminders), `/jobs`
  (list), `/ajustes` (language/theme/sign-out), `/empresa`
  (panel+dispatch queue+revenue), `/empresa/equipo`. Empresa assign uses a
  member select (not drag-and-drop — time-boxed). /pro wrapped as-is (earnings
  + calendar already there); full dashboard visuals in U7.
- SiteChrome mounts the shell on all non-marketing/auth/dev routes (no file
  moves pre-freeze — same URLs, logical groups).

## 2026-10-29 — U3 auth (phone or Meta glasses)

- `company` added to the UI role set (auth cookie, menus, badges); data model
  (`015_companies` + widened `profiles_role_check`) lands with U4. Until then a
  company demo session reads pro surfaces.
- Real magic-link login fixed: `@supabase/ssr` cookie sessions (callback at
  `/auth/callback` → role home), middleware session refresh, `getSession`
  accepts Bearer OR cookie, browser client is cookie-based. Contract-sign OTP
  untouched (signing ceremony, not login).
- Pairing: 6-char codes from an unambiguous alphabet, SHA-256 only in DB,
  single-claim, 10-min expiry, live polling (2 s) with Realtime upgrade path.
  QR is a server-rendered data-URL (no raw SVG injection). Honest copy about
  the companion developer preview + phone fallback everywhere.
- Old `/login` replaced by the (auth) group (same URL): role cards → phone or
  glasses → sent/resend-30s → signup profile step (PATCH /api/profile).
  Alcaldía/Empresa show "Requiere verificación" (empresa → /pro/apply;
  alcaldía access form lands in U5).

## 2026-10-29 — U2 header, footer, global nav

- `motion` 14.8.0 installed (spec named v12; v14 keeps the `motion/react` API).
- Mega-menu feature links point at live routes or real landing anchors; U6 deep
  pages will replace the anchors. Social links are text placeholders (no URLs to
  invent). Company role renders in menus/badges; `015_companies` + dispatch UI
  land with U4. Bell opens role quick-links (no notification feed yet — covered
  by the pending email-provider decision).

## 2026-10-29 — U1 Foundation (tokens, fonts, RAC primitives, Blueprint, FlowNav)

- Stack change per owner decision (AGENTS.md §4): NO shadcn/ui, lucide, Inter.
  Primitives on React Aria Components 1.22.1 (Apache-2.0), icons
  @phosphor-icons/react 2.1.10 (MIT), date logic @internationalized/date 3.12.4
  (Apache-2.0). GSAP/Motion/Lenis deferred to the blocks that use them (U5/U7).
- Fonts self-hosted in `public/fonts` (woff2, latin subsets): Cabinet Grotesk
  700/800 + General Sans 400/500/600 (Fontshare — free for personal AND
  commercial use), JetBrains Mono 400/600 (SIL OFL 1.1). `next/font/local`,
  preload display 800 + body 400/600.
- Dark mode via `data-theme` on `<html>` (system default, localStorage,
  no-FOUC init script); Tailwind colors mapped to vars so themed screens adapt.
  Legacy `.card/.btn` classes repointed at tokens; removed in U7 per-screen.
- Root `max-w-md` wrapper removed per spec (marketing 1280 / app 1200 +
  sidebar land in U2/U4; desktop is temporarily full-width on old screens).
- FlowNav (Back/Continue) wired across the core loop: scan, quote→book,
  book receipt→live job, jobs, pro + job mode, contracts, projects, fund,
  passport, city, admin, login, apply, calendar. i18n `back`/`continue` ES/EN.
- RAC Button keeps the old `onClick`/`disabled` API (mapped to onPress/
  isDisabled) so call sites didn't churn; `accent` variant retained (signal
  orange is the brand action color).
- Screenshots 375/768/1440 light+dark NOT done — no browser in this env;
  owner step with a real phone + desktop (see PROGRESS).

## 2026-10-29 — Visual Motion Pass (CSS-first, zero new deps)

- Foundation (`globals.css`): warm gradient paper, shadow/glow tokens, keyframe
  library — stagger (60 ms steps), pop-in spring, scan beam, shutter ripple,
  CTA sheen, progress ticker, float, SVG draw-check, marquee, toasts. All
  transform/opacity-only; `prefers-reduced-motion` disables the lot.
- Components (`ui.tsx`): accent Button glow+sheen, Card hover lift, Badge live
  dot, Stepper animated fill + glowing current step, Timeline newest-first with
  live-dot + stagger, CameraFrame viewfinder + beam, `useCountUp` PriceRange,
  `toast()` + `<Toaster/>` (mounted in layout).
- Screens: scan (viewfinder brackets, glowing shutter, beam while working,
  ticker progress), quote (staggered cards, pop price card, draw-in damage box),
  landing (mesh-gradient floating quote card, staggered hero/how/problem cards,
  category marquee, glowing CTAs), job watch (draw-check on release).
- Deliberately no framer-motion: keeps the JS bundle and Lighthouse budget
  untouched this close to freeze.

## 2026-10-29 — P1 fix: auth onboarding that works (014)

- Audit finding: no signup trigger existed, so magic-link users got NO profile
  row (customer default forever) and approved pros could never log in as pro;
  `seed-demo-users.ts` upsert on `pros.user_id` would have failed (no unique
  constraint). Fixed before any live apply: `014_auth_onboarding.sql` adds a
  `SECURITY DEFINER handle_new_user()` trigger (customer profile + approved-
  application email match → promote to pro + link `pros.user_id`), a
  `pros.application_id` link, and the missing unique constraint.
- `pro_applications` gains `email` (form field + Zod + approve-time linking if
  the pro already signed in). `009` trims Miami to the 5 documented keepers.
- Runbook for the go-live gate: `docs/keyed-verification.md` (two-phone loop ×2,
  RLS negatives, money checks, sign-off). Launch doc §1 updated to 001→014.

- Pro onboarding: public `/pro/apply` (name, trade, zone, phone, rate, ID photo;
  no session, 5/min, Zod) → `pro_applications` (migration `013`, RLS default
  deny, service-role only) → `/admin/pros` queue (signed 60 s ID-photo URLs,
  reject requires a reason) → approve inserts into `pros` (real) or the approved
  memory pool (demo) so match/search sees them. Landing "Únete" now points at
  `/pro/apply`. ID photos: private `media` bucket in real mode, ≤1.5 MB data URL
  in memory mode (same bound pattern as scans).
- Share: job page gets WhatsApp + Facebook share intents (plain links, no APIs)
  plus `navigator.share` when available (reaches the Instagram app) with
  copy-link fallback; Instagram has no web share endpoint, stated in the UI note.
- Security review (`docs/security-review.md`): all §7 sections PASS on code;
  2 OPEN items need keys (live RLS apply, live payment capture). Verified 55/55
  route files gated (5 intentionally public). `docs/architecture.md` +
  `docs/meta-tech.md` written (every Meta tool, where, latency table).
- Business accounts deferred to CUT.md (crew story already covered by S4
  per-trade booking).
- web tests 75/75, ai 37/37, typecheck + `next build` green. Audit unchanged
  (1 non-actionable zod).

## 2026-10-29 — S8 Pro Copilot (hands-free expert in job mode)

- `packages/ai/copilot.ts` + `prompts/copilot.md`: `answerCopilot` (Q&A grounded in
  the spec, short spoken answers, Zod + one retry) and `watchHazards` (advisory-only
  frame check, never blocks, never certifies safety). Mock-first when keyless.
- Routes `/api/copilot/ask|hazard|evidence` (pro/admin, rate-limited): ask logs a
  `copilot_qa` event and the phone speaks the answer; hazard logs a `hazard` event
  only on positives (60 s watch re-checks the latest frame note); evidence stores a
  ≤2 MB frame as `step_evidence` and ticks the step done, feeding verification.
  `booked` counts as on-the-job for copilot (pro prepping early is realistic).
- Job mode gains a Copilot card (type or hold-to-talk via `/api/transcribe`), a
  hazard-watch card (frame note + check + 60 s toggle, spoken warnings), and a per-step
  "✓ Listo" camera button. The customer live view renders Q&A, advisories and evidence
  thumbnails. Spanish detection covers unaccented text (stopword fallback).
- `apps/web/vitest.config.ts` maps `@/` for route-level tests (none existed before).
- ai tests 37/37, web tests 71/71, typecheck + `next build` green. 1 residual audit
  high = known non-actionable zod advisory.

## 2026-10-29 — S7 TaskLens for Cities (all of LatAm, private per city)

- Directory-first design (`lib/cities.ts`, 14 cities SV/GT/HN/NI/CR/PA/CO/PE/MX):
  every report, cluster read and operator write is fenced by `city_slug`, so a
  resident only ever sees their own city's board (location → nearest directory
  city, remembered). Operators carry their municipality in the session
  (`profiles.city_slug` real mode, `tasklens_city` cookie demo mode) and
  `updateReport` + RLS reject cross-city writes. New `city_operator` role in
  auth, demo login (city select on `/login`), seed script and migration 012.
- Muse Spark triages each report (category/severity/ES summary/SLA 4–168 h) with
  an image-input person-subject check; 422 `person_subject` rejects, never stores.
  Coords snapped to 4 decimals. Duplicates cluster geo+category (150 m).
  Operators get AI-suggested contractors (trade map → pro search ≤40 km) and a
  status pipeline with guarded transitions; `/city` board is ES/EN with SLA badges.

## 2026-10-29 — P0-6 glasses companion (real project, honest mock)

- `apps/glasses-android` is now a real Android Studio project (AGP 8.9.2, Kotlin
  2.1.20, Compose BOM, compile/targetSdk 35 — raise to Play-required at build).
  Flow: "Fix this" → capture → `POST /api/glasses/upload` → TTS summary on the
  phone speaker → "Open quote" deep link. Auth = user's credential only
  (`demo:<role>` cookie on demo servers, Supabase JWT Bearer in production).
- No compile in this env (no JDK/SDK): `./gradlew assembleDebug` is an owner step
  in `apps/glasses-android/README.md`. Code was reviewed file-by-file instead
  (DeviceProvider seam, FileProvider authority, audio/mp4 accepted server-side).
- Real-glasses path is a documented seam (`WearablesDeviceKit` throws with setup
  steps; `DeviceProvider.USE_WEARABLES=false`); mock capture is a real bundled
  synthetic JPEG, always labeled "sample (mock)". No real integration claimed.

## 2026-10-29 — P0-5 Android TWA + PWA

- Hand-rolled `sw.js` (network-first navigations → `/offline`, cache-first icons;
  never touches POSTs or cross-origin) + `sw-register.js` via `next/script` — zero
  new deps. `sw.js` ships `Cache-Control: no-cache` so updates propagate.
- Icons/feature graphic generated by `scripts/gen-pwa-assets.py` (Pillow, committed
  outputs). Maskable icon keeps the glyph in the central safe zone; the bundled
  font lacks `·`/accents, so store graphics use ASCII-only copy.
- `/.well-known/assetlinks.json` fails closed (404 `not_configured`) until the owner
  sets `ASSETLINKS_SHA256_FINGERPRINTS` from Play app signing, then redeploys.
- TWA (`apps/android-twa`, package `com.tasklens.app`, targetSdk 36 — re-check in
  Play Console at submission): Bubblewrap build needs JDK/Android SDK, absent here,
  so the signed AAB + no-bar install check + 8 screenshots are owner steps documented
  in `apps/android-twa/README.md` and `docs/store/screenshots.md`. The store build
  contains no glasses code by construction (separate `apps/glasses-android` project).

## 2026-10-29 — S5+S6 + audit fix

- Funding links (`lib/funding.ts`, migration `011`): random 32-byte token in URL, SHA-256
  hash only in DB, single-use, 72 h expiry. Payer view (`/fund/[token]`, `GET /api/funding/[token]`)
  shows title/price/summary only — never address/phone. Mock provider auto-approves;
  PayPal returns an order for the relative to approve, then PATCH finalizes.
- Fair-fix mediator (`packages/ai/mediator.ts` + `/api/disputes`): Muse compares signed
  scope + change orders + verification checks → `redo | partial_release`. AI never moves
  money: partial capture happens only after the OTHER party (or admin) accepts.
  Same-side accept → 403 `needs_other_party`; double-accept guarded. Redo reopens
  `pending_verify/completed → in_progress` (TRANSITIONS extended).
- Audit: root `pnpm.overrides` pins `postcss` to 8.5.32 (kills 8 transitive highs from
  Next/Tailwind; build + tests re-verified). 1 residual (zod GHSA-mrhx, via openai SDK
  pin 3.25.76, basic schemas only) stays non-actionable.

## 2026-10-29 — S4 Project Planner

- Walkthrough video is sampled to 8 JPEG frames client-side (canvas seeks) — no server
  ffmpeg, no video codec risk; the 8-frame "fallback" from the spec is the primary path.
  Renders: 3 styles via Muse Image, mock-null keyless. Crew books one pro per trade in
  sequence; each phase is a job row, so match/hold/verify flows work unmodified per phase.
  Milestone escrow = per-phase PayPal authorizations. Done-check: 5 phases booked in order.

## 2026-10-29 — P0-4 landing (ES-first, no invented stats)

- 10-section landing per spec; ES primary, EN toggle, zero invented numbers (work/time
  figures are labelled illustrative). Pro CTA → /login (full onboarding is P1).
  OG card generated by route (`/opengraph-image`) until a Muse Image key exists;
  privacy/terms ship minimal bilingual versions now (full P0-5 pass later).

## 2026-10-29 — P0-3 design system + frontend rebuild

- Tailwind + tokens (Ink/Paper/safety-orange/trust-green/slate, Bricolage+Inter, radius
  12/10) + hand-rolled `components/ui.tsx` (shadcn-style API, zero new deps — avoids a
  radix dependency fan-out this close to freeze). Mapbox GL with graceful no-token fallback.
- Masked a real P0-2 gap during ES reseed: `/api/pay/hold` hardcoded Miami coords while the
  pool moved to San Salvador → empty search → `pro_not_offered`. Hold now takes lat/lng
  (SV defaults) like match/book.
- Ratings: 1–5 + comment after completion; pro average recomputed server-side (trust input).
- ES seed migration (25 SV pros; 5 Miami kept); mock pool + all geo defaults now San Salvador.

## 2026-10-29 — S2 Smart Calendar

- AI slot suggestions (urgency + availability + haversine travel; Mapbox Matrix is the
  upgrade when a key exists), starred in the book UI. Day plan + spoken briefing (Web
  Speech API), week view with block/unblock, private ICS feeds (random token, hash-only,
  revocable) and mutual-approval reschedule (flags PayPal re-auth when moving >3 days).
- Same dual-bundling lesson as P0-2: calendar stores also live on `globalThis`.

## 2026-10-29 — S1 Contract Studio (never-cut)

- Fixed clause library (`packages/ai/contracts/clauses/*.md`, 8 files); Muse fills ONLY
  `{placeholders}` (mock fallback when keyless). Zod `ContractDraft` + 5-line bilingual summary.
- E-sign: typed name + hand-drawn canvas (no new dep — plan's `signature_pad` named one
  option; canvas avoids audit surface) + email OTP (Supabase in prod, demo code shown in
  dev). Both roles → `fully_signed`; escrow approval is gated on it when a contract exists.
- PDF: hand-rolled deterministic writer (`lib/pdf.ts`) — `@react-pdf/renderer` breaks under
  Next.js dev bundling (dual-React reconciler split, React #31; reproduced in isolation as
  working, failing only in the route; uninstalled). Hash covers the canonical text rendering.

## 2026-10-29 — P0-1 code (persistence + keys, no owner keys yet)

- Production boot guard (`instrumentation.ts` + `lib/env.ts`): serving production without
  Supabase or `MODEL_API_KEY` throws at boot. Demo paths (`demoMode`, demo cookie login,
  memory stores) are impossible in production — `demoAllowed()` is false there.
- CSP moved to `middleware.ts`: dynamic per environment (Supabase https+wss, PayPal, Mapbox
  only when configured; `unsafe-eval` dropped in production). Static headers removed.
- Rate limiting is Postgres-backed (`004_rate_limits.sql` + `rate_limit_hit()` RPC) with
  in-memory fallback; all 14 route call sites now `await hitRateLimit()`.
- Demo accounts (production) = real Supabase users via `packages/db/scripts/seed-demo-users.ts`
  (service role; owner runs with keys). `/api/auth/demo-login` signs server-side into the
  seeded customer/pro accounts and returns tokens; admin is never one click.
- NOT DONE (owner blockers): link Supabase project, apply 001–004, `supabase gen types`,
  Vercel project + env vars, real Meta/PayPal/Stripe keys, keyed end-to-end verification.

## 2026-10-29 — Day 8: fixes-only + submit readiness

- Fixed the last unguarded route: `GET /api/scan` now requires a session and enforces
  scan ownership (real mode, customers). All 20 API routes now check sessions or
  signatures (Stripe webhook).
- Final regression: 44/44 tests, typecheck, production build, audit (same 5
  non-actionable), full core loop ×2 (~5 s both, no manual DB edits).
- Still open before production: keyed verification (Supabase Auth/RLS/Storage, Stripe
  capture, Muse key paths), `demo.gif` recording (human step), public repo flip.

## 2026-10-29 — Day 7: demo recording support + README

- README now covers problem, GIF slot (`apps/web/public/demo.gif`, recorded via DEMO.md),
  ASCII architecture, Meta tech, 5-command setup, env table. `DEMO.md` holds the 60 s
  shot-by-shot recording script (reset → scan → quote → book → job mode → live watch).
- One-click demo fixture on `/scan` ("Try demo photo"): canvas-rendered leaking-P-trap PNG
  through the real upload pipeline — for recordings and reviewers without a leak at hand.
  The actual `demo.gif` must be recorded by a human (no screen recorder in this env).

## 2026-10-29 — Day 6: harden, i18n, security review (§7)

- Auth: Supabase magic-link (browser) + demo role login (`POST /api/auth/demo`, rate-limited,
  demo-only 404s when Supabase is configured). `getSession()` validates the Supabase JWT and
  reads the role from profiles in real mode; demo mode trusts the role cookie (default customer).
- Every API route now checks the session: scan/transcribe/glasses (any role), match/book
  (customer/admin + scan ownership in real mode), job mutations + verify + preview (pro/admin),
  admin reset (admin). `/login` page; role shown via `/api/auth/me`.
- `003_rls_lockdown.sql` replaces allow-all with per-role policies (default deny); pros and
  availability stay publicly readable (marketplace listing). Private `media` bucket, service
  role only; scans upload the first photo; clients get 60 s signed URLs via `/api/media/sign`.
- `/admin` + `POST /api/admin/reset` (admin-only, rate-limited): clears demo data in <5 s
  (0 ms mock, measured). Full i18n sweep: home/scan/quote/book/pro/watch/login/admin EN+ES.
- NOT YET PROVEN (no Supabase project linked): applying 003 to a live DB, real magic-link
  round-trip, real Storage upload/sign, real Stripe capture. All code paths exist and mock
  cleanly; keyed verification required before production (Day 8 or sooner).

## 2026-10-29 — Day 5: verification, payment release, SAM highlight, Muse Image preview

- `POST /api/jobs/verify` runs `verifyCompletion` (mock `mockVerifyResult` without a key).
  Pass → job `completed` + Stripe capture (mock `succeeded`); ONLY this path captures payment.
  Review → stays `pending_verify` for fix + resubmit. Real mode requires a stored "before"
  (scan's first photo kept in memory, ≤1.5 MB); mock grades on after photos.
- SAM highlight is best-effort inside verify (`segmentDamage`, 15 s cap, never blocks);
  mock returns the spec `damage_box` overlay instead. Muse Image preview endpoint exists
  (`POST /api/jobs/preview`); mock returns null with an honest note until a key is set.
- Full loop verified twice end-to-end with no manual DB edits (~2.6 s/loop in mock).

## 2026-10-29 — Day 4: pro job mode + realtime job log

- Job state machine (Day 4): booked → en_route → in_progress → pending_verify.
  `transitionJob()` + `POST /api/jobs/transition` enforce it (409 `invalid_transition` otherwise).
  completed/disputed land Day 5 (verification + payment release).
- Realtime: Supabase Realtime channels when configured; 2 s polling fallback otherwise
  (`useJobFeed` hook shared by pro + customer views). Live vs polling shown as a badge.
- Checklist ticks are first-class events (`POST /api/jobs/step`, kind `step`) so the customer
  sees each completed repair-plan step live. Checklist itself loads from the scan's `ai_spec.steps`.
- Voice notes transcribe server-side (`POST /api/jobs/note`, demo mock without key); before
  photos logged as events (`POST /api/jobs/photos`). Real Storage uploads land with auth (Day 6).

## 2026-10-28 — Day 3: match/book/escrow + glasses photo capture

- Escrow = Stripe PaymentIntent `capture_method=manual` (TEST mode). `holdPayment()` in
  `apps/web/lib/stripe.ts`; mock `pi_mock_*` when no `STRIPE_SECRET_KEY`. Webhook verifies
  signatures server-side (`/api/stripe/webhook`); capture-on-pass-verdict lands Day 5.
- Booking requires literal `confirm: true` in `/api/book` (400 `confirmation_required`
  otherwise) AND the pro must be in the server-recomputed top 3 (409 `pro_not_offered`) AND the
  slot must be offered (409 `slot_unavailable`). Amount = spec price midpoint, server-side only.
- `matchAndBook()` agent loop (tools search_pros/get_availability/create_booking) with a
  code-level guard: `create_booking` executes only for the customer-confirmed pro/slot, even if
  the model calls it. Mock path uses deterministic `rankPros` + rate×hours pricing.
- Glasses and phone share one pipeline (`lib/scan-pipeline.ts`): `POST /api/glasses/upload`
  takes a single `photo` frame + `x-device` header, returns scanId/spec + `/book` deep link.
  Android `GlassesUploader.kt` is stdlib-only (uncompiled here — no Android SDK in this env).

## 2026-10-28 — Day 2: web scan + voice + quote screen

- `apps/web` keeps `@tasklens/ai` as a server-only external (`serverExternalPackages`), not bundled.
  Why: `muse.ts` reads `prompts/*.md` via `fs` + `import.meta.url`; webpack-bundling it breaks
  Next build page-collection (cross-realm `URL` fails `fs` path checks). Prompts also load lazily
  (inside `scanToSpec`/`verifyCompletion`, cached) so importing the module never touches disk.
- `POST /api/scan` mock-first: `DEMO_MODE=true` (or no `MODEL_API_KEY`) returns the deterministic
  `mockScanSpec()` fixture so phone scan → quote works with zero keys. Real path calls
  `scanToSpec()` with a 30 s timeout once (the helper already retries once internally).
- Scans persist to Supabase when env is configured, else an in-memory store (dev/demo, single
  instance). First photo is echoed via `sessionStorage` for the damage-box overlay; server never
  stores data URLs.
- Voice: `POST /api/transcribe` (MediaRecorder `audio/webm` → Muse ASR, mock transcript in demo).
  Client transcribes immediately for preview; server re-transcribes only if no transcript was sent.
- `pnpm audit`: bumped `next` 15.0.3 → 15.5.28 (41 vulns fixed: RCE/auth-bypass/DoS advisories).
  Remaining 5 are not actionable: 4× postcss transitive via Next latest 15.x, 1× zod v4-line
  advisory while pinned to 3.25.76 (basic object/enum schemas only; no affected validators in use).

## 2026-10-28 — Day 1: foundations

- SAM via Model API (`sam-3.1` over `POST /v1/responses` streamed), never a separate endpoint URL.
- Wearables Device Kit has no public endpoint in docs → Mock Device Kit first (`apps/glasses-android`).
