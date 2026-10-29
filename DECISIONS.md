# TaskLens — decisions

Record of stack/behavior decisions. Newest first. (AGENTS.md: docs beat this file on Meta API conflicts.)

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
