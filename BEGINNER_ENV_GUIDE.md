# TaskLens — beginner env guide (zero to fully working)

You don't need to be a pro. Follow Parts 1→7 in order. Each part says
**what to click**, **what to copy**, and **how to know it worked**.
I already did the code prep: `.env.example` now lists every var the code
reads, `docs/production-launch.md` migration range fixed to `001→017`,
and `scripts/check-env.mjs` checks names only (never prints secrets).

Run anytime (safe, prints OK/MISSING only):
```bash
node scripts/check-env.mjs          # local: all MISSING is normal today
node scripts/check-env.mjs --prod   # must be all OK before Vercel deploy
```

Rule 1: secrets go in `apps/web/.env.local` (your PC) and Vercel
dashboard (production). Never paste them in chat, screenshots, or git.
Rule 2: vars starting `NEXT_PUBLIC_` are visible in the browser — only
URLs/anon keys go there. `MODEL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`PAYPAL_CLIENT_SECRET`, `STRIPE_*` are server-only.

---

## Part 1 — Supabase (database + login + photos, ~60 min)

What this gives you: real users, real jobs, real photo storage.
Without it the app runs on fake in-memory data that resets on restart.

1. Go to `https://supabase.com` → Sign up (GitHub login is easiest) →
   Dashboard → New Project.
2. Name: `tasklens`, password: generate + save in a password manager,
   region: closest to El Salvador (e.g. East US), Create. Wait ~2 min.
3. Project Settings (gear) → API: copy 3 values onto paper:
   `Project URL`, `anon public key`, `service_role secret key`.
4. Left menu → SQL Editor → New query. Open these files in Notepad ONE
   BY ONE, copy ALL text, paste, Run, wait for "Success":
   `packages/db/migrations/001_schema.sql` → `002` → `003` → … → `017`
   (17 files, order matters). If one fails, stop and read the red error —
   usually means a previous file was skipped.
5. Check: Table Editor → you should see tables `profiles, pros,
   scans, jobs, job_events, payments, companies, city_reports…`.
6. Storage → Create bucket → name `media`, Private ON, Create.
7. Auth → Providers → Email → ON, "Confirm email" OFF for testing,
   Save. Later add your SMTP sender for real magic links.
8. Your PC: copy `.env.example` to `apps/web/.env.local`, fill:
   `NEXT_PUBLIC_SUPABASE_URL=<Project URL>`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
   `SUPABASE_SERVICE_ROLE_KEY=<service_role — server only>`
   `STORAGE_BUCKET=media`
   `NEXT_PUBLIC_APP_URL=http://localhost:3000`
9. Check: `node scripts/check-env.mjs` shows those 4 as OK.
10. Run locally: `pnpm dev` → open `/login` → magic link → you are in.
    This proves the DB + trigger `014_auth_onboarding` works.

What I can't do for you: create the Supabase account/project (it's
your account + password + billing). Everything after that is copy/paste.

## Part 2 — Meta AI key (real quotes, voice, verification, ~20 min)

Without it: deterministic mock spec ("sifón corroído $120-220").
With it: real `scanToSpec`, transcription, SAM mask, Muse Image preview.

1. Go to `https://dev.meta.ai` → developer dashboard → create key.
2. In `apps/web/.env.local` add:
   `MODEL_API_KEY=<paste — server only>`
   Leave `MODEL_BASE_URL=https://api.meta.ai/v1`,
   `MODEL_ID=muse-spark-1.3`, `MODEL_FALLBACK_ID=muse-spark-1.2`,
   `ASR_MODEL=muse-voice-transcribe-1.0`,
   `IMAGE_MODEL=muse-image-1.0`, `SAM_MODEL=sam-3.1` as-is unless
   `dev.meta.ai/docs` says otherwise (docs win).
3. Restart `pnpm dev`. Scan a real photo → quote should take <15s and
   differ per photo (mock always returns the same fixture).
4. If an endpoint 404s/422s: read `dev.meta.ai/docs`, tell the agent the
   exact page — shapes are fixed doc-driven, never guessed.

## Part 3 — PayPal sandbox (hold money without real money, ~30 min)

Primary provider. `AUTHORIZE` = hold at booking, capture only on AI
`pass`. Sandbox = fake money, safe to test.

1. `https://developer.paypal.com` → Log in → Sandbox Accounts → create
   1 Business (seller) + 1 Personal (buyer). Note their emails.
2. Apps & Credentials → Sandbox → Create App → copy `Client ID` +
   `Secret`. Add webhook: Orders v2 events → copy `Webhook ID`.
3. `apps/web/.env.local`:
   `PAYPAL_CLIENT_ID=<id>`, `PAYPAL_CLIENT_SECRET=<secret — server only>`
   `PAYPAL_WEBHOOK_ID=<id>`, `PAYPAL_ENV=sandbox`
   `NEXT_PUBLIC_PAYPAL_CLIENT_ID=<same id>`
   `PLATFORM_FEE_PCT=10`
4. Test: `/book/[scanId]` → Pay with sandbox buyer card → job `booked`,
   `payments=held`. Verify `pass` → `released + payout row`.
   `review` stays `held`. Only flip `PAYPAL_ENV=live` after a verified
   PayPal Business account exists.

Stripe is secondary, US-only (El Salvador unsupported). Skip unless you
have a US entity: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## Part 4 — Mapbox + app URL (map pins, ~10 min)

1. `https://account.mapbox.com` → Tokens → Create → copy.
   `NEXT_PUBLIC_MAPBOX_TOKEN=<token>` (public, domain-restricted later).
   Without it the map shows a graceful fallback — not blocking.
2. `NEXT_PUBLIC_APP_URL=http://localhost:3000` locally.

## Part 5 — Demo logins for recordings (~15 min)

Admin is NEVER one-click. Do this once Supabase works:

```bash
SUPABASE_URL=<Project URL> SUPABASE_SERVICE_ROLE_KEY=<service_role> DEMO_USER_PASSWORD=<12+chars-you-invent> pnpm --filter @tasklens/db seed-demo
```

Then put in Vercel (Part 6), NOT in git:
`DEMO_CUSTOMER_EMAIL/DEMO_CUSTOMER_PASSWORD`,
`DEMO_PRO_EMAIL/DEMO_PRO_PASSWORD`.

## Part 6 — Vercel deploy (put it on the internet, ~30 min)

1. `https://vercel.com` → Sign up → Add New Project → Import
   `github.com/Lappsnet/tasklens`, root directory `apps/web`.
2. Environment Variables → Production → paste EVERYTHING from Parts 1-5,
   plus `NEXT_PUBLIC_APP_URL=https://<your-domain>`.
   Leave `DEMO_MODE` UNSET and `ASSETLINKS_SHA256_FINGERPRINTS` empty.
3. Deploy. Logs must NOT contain `[tasklens] production boot refused`.
   If it does: a required var from `check-env --prod` is missing.
4. After Play Console gives you an app-signing SHA-256: set
   `ASSETLINKS_SHA256_FINGERPRINTS=<print>`, Redeploy.

## Part 7 — Prove it (keyed verification, ~2h, the real gate)

On the Vercel URL with two phones (A=customer ES, B=pro):
`/scan` photo+voice → `/quote` <15s → `/book` sandbox pay → `held` →
B `/pro/jobs/[id]` en_route→in_progress→Copilot question spoken→
`listo` frame→after photos→verify → A watches live timeline→`released`→
rate 5★. Repeat swapped (B customer EN, A pro ES). Full script:
`docs/keyed-verification.md`. Record times in `PROGRESS.md`.
Negatives must fail: A can't open B's job, customer can't hit
`/api/admin/reset`, anon reads 0 rows of others' `payments`.

## What is still NOT "fully working" after env

- Transactional email (booking/en-route/completed): app sends only
  magic-link OTPs. Demo with timeline + WhatsApp share, or approve a
  provider (e.g. Resend) — agent must ask first per `AGENTS.md`.
- Real pro withdrawals: ledger `pending` until PayPal Payouts approval.
- `NEXT_PUBLIC_DEMO_VIDEO_URL`: empty = "Demo disponible pronto" state.
- Team Business accounts: deferred to `CUT.md` (S4 crew covers demo).

Deadlines: Play closed testing Oct 31, freeze Nov 2 20:00, submit
Nov 4 12:00 UTC-6. Do Parts 1+2+6 first — they unblock everything.
