# TaskLens — decisions

Record of stack/behavior decisions. Newest first. (agent.md: docs beat this file on Meta API conflicts.)

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
