# TaskLens — security review (AGENTS.md §7)

Date: 2026-10-29. Method: code inspection of every route, lib and migration
plus `pnpm audit`, `tsc`, and route-level tests. Items marked OPEN need a keyed
environment (Supabase project, Vercel) and are owner steps.

## 1. Secrets — PASS

- `.env*` in `.gitignore` since the first commit; repo ships `.env.example`
  (variable names only). No secret appears in `git log -p` output.
- Server-only keys (`MODEL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`, `SAM_API_KEY` via `SAM_MODEL`)
  are read only in route handlers / server libs (`apps/web/lib/*`,
  `app/api/*/route.ts`). No `NEXT_PUBLIC_` prefix on any of them.
- Public-by-design `NEXT_PUBLIC_*`: Supabase URL + anon key (required by the
  browser client), Mapbox token, PayPal **client ID** (JS SDK, public by design),
  app URL. Anon key is safe only because RLS denies everything by default.
- Errors returned to clients are generic (`bad_request`, `errorGeneric`);
  details go to server logs without PII or secrets. No `dangerouslySetInnerHTML`
  anywhere; model output is validated with Zod and never executed.

## 2. Auth and data access — PASS (code) / OPEN (live DB)

- RLS enabled on every table in its migration (`001`, `003_rls_lockdown`,
  `004`, `006`–`013`); default deny, explicit per-role policies. Customers see
  only their scans/jobs/payments; pros only assigned jobs; `pros` + `availability`
  stay publicly readable (marketplace listing, by design).
- 55 route files audited: 50 call `requireRole()` with least-privilege roles
  (e.g. `/api/pros/decide` and `/api/pros/applications` admin-only, `/api/admin/*`
  admin-only). The 5 without a gate are intentionally public: `/api/health`,
  `/api/auth/me` (own session), `/api/auth/demo*` (demo only — `demo-login`
  404s without Supabase and never offers admin), `/api/pros/apply` (public form,
  5 req/min, Zod, ID photo required).
- Webhook routes verify signatures server-side (`stripe/webhook`,
  `pay/webhook` → provider `verifyWebhook`); idempotency keys on create/capture.
- Service role is used only in server code with a documented reason at each
  call site; ownership is re-checked in code (`visibleJobs`, scan-ownership
  checks in match/book/scan).
- Production guard (`instrumentation.ts` + `lib/env.ts`): serving production
  without Supabase or `MODEL_API_KEY` throws at boot; demo cookie login is
  impossible in production.
- New auth users get a `profiles` row from the `014 handle_new_user()` trigger
  (customer default; promoted to pro on approved-application email match).
- OPEN: applying `001`–`013` to a live Supabase project, the real magic-link
  round-trip, and live Storage RLS have never run (no project linked). Owner step.

## 3. Input and AI safety — PASS

- Every mutating route validates its body with Zod at the boundary (JSON and
  multipart). Amounts are computed server-side from the job record, never from
  the client (`book`, `pay/hold`, `funding`, `disputes`).
- Uploads: allowlist `image/jpeg|png|webp` (+ audio types on voice routes),
  10 MB cap (2 MB for copilot evidence frames, 1.5 MB memory-store bound),
  random bucket names via `uploadPhoto()`, private bucket + 60 s signed URLs.
- Model output: Zod-validated, one retry with the validation error in the prompt
  (`scanToSpec`, `answerCopilot`, mediator, triage); drafts stay drafts until a
  human approves. The AI never signs, pays, captures or closes anything —
  enforced in code (capture only in `jobs/verify` on `pass`; partial capture
  only after the other party or admin accepts).
- Tool-exposed model paths (`matchAndBook` tools) act only on the current
  user's records; booking additionally requires literal `confirm: true`, a
  server-recomputed top-3 slot, and an offered slot.

## 4. Payments — PASS (sandbox/mock) / OPEN (live)

- PayPal Orders v2 `AUTHORIZE` (primary) + Stripe manual-capture (secondary),
  behind `lib/payments/` provider interface. Mock provider in tests only.
- Capture happens on exactly one path: `POST /api/jobs/verify` with a `pass`
  verdict. `review` stays held; dispute/cancel voids. Webhook signatures
  verified; `PayPal-Request-Id` idempotency on create/capture.
- Reauthorization rule for jobs > 3 days out is coded in the reschedule flow.
- Pro payouts: ledger row per capture (amount minus 10% fee, configurable);
  real Payouts API behind a flag (needs PayPal approval).
- OPEN: live capture + real Payouts approval need a verified PayPal Business
  account (owner step). Sandbox card flow is implemented but unkeyed.

## 5. Web and API hardening — PASS

- Rate limiting on all 55 routes (Postgres `rate_limits` + RPC in production,
  in-memory fallback in demo/test): scan/book/auth at 5–10/min, reads at 30–60.
- CSP via `middleware.ts`: `frame-ancestors 'none'` (+ `X-Frame-Options: DENY`),
  `nosniff`, strict `Referrer-Policy`, camera/mic self-only, `connect-src`
  exactly the configured backends (Supabase https+wss, PayPal, Mapbox), Meta API
  server-side only (never in CSP), `unsafe-eval` dropped in production.
- PWA service worker never touches POSTs or cross-origin requests.

## 6. Dependencies — PASS

- `pnpm audit` (2026-10-29): 1 high — zod GHSA advisory via the OpenAI SDK pin,
  non-actionable (basic object/enum schemas only; no affected validators in use).
  PostCSS transitives pinned to 8.5.32 via root override. No new deps added for
  P1 (hand-rolled components, no `signature_pad`/`react-pdf` fan-out).

## 7. Residual risks (accepted, tracked)

1. Demo-mode memory stores are per-process (documented; Supabase replaces them
   in production; boot guard refuses production without it).
2. Keyed verification never run: Supabase Auth/RLS/Storage, Stripe/PayPal live
   capture, Muse key paths, `demo.gif` (human step). Owner steps before submit.
3. Business accounts (team pros) deferred — see `CUT.md`.
