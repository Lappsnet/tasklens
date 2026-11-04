# Go-live: Netlify + Supabase (real data, real accounts, real video)

Production URL: `https://tasklen.netlify.app/`
(Date: Nov 2026 — Day 7/8 fix pass. This doc is the source of truth for go-live; `docs/vercel-env-vars.md` is the Vercel variant.)

## 0. What changed in code (already done)

- Demo video is now embedded by default: YouTube `7U4Fy3_roUI` in
  `apps/web/content/landing.es.ts` + `landing.en.ts`. `NEXT_PUBLIC_DEMO_VIDEO_URL`
  still overrides it if set.
- Showcase gallery relabeled `Ejemplos reales / Real examples` (was `datos de demostración`).
  Scans/jobs created in the app were always real Supabase rows when keys are set —
  the gallery is a static photo set, not the database.
- Auth now has **password login/signup as the default tab**, magic link as secondary.
  Password auth does not depend on email delivery for login (only signup needs the
  confirmation email if Confirm-email is ON — see §2).

## 1. Netlify env vars (required for REAL data)

Netlify Dashboard → Site `tasklen` → **Site settings → Environment variables** →
Add all rows → **Deploys → Trigger deploy → Clear cache and deploy**.

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` (API URL, NOT dashboard URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` (anon/publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (service_role — server only) |
| `STORAGE_BUCKET` | `media` |
| `MODEL_API_KEY` | Meta key from dev.meta.ai |
| `MODEL_BASE_URL` | `https://api.meta.ai/v1` |
| `MODEL_ID` / `MODEL_FALLBACK_ID` | `muse-spark-1.3` / `muse-spark-1.2` |
| `ASR_MODEL` / `IMAGE_MODEL` / `SAM_MODEL` | `muse-voice-transcribe-1.0` / `muse-image-1.0` / `sam-3.1` |
| `NEXT_PUBLIC_APP_URL` | `https://tasklen.netlify.app` (no trailing slash) |
| `PAYPAL_CLIENT_ID` + `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | same sandbox client id |
| `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` / `PAYPAL_ENV=sandbox` | sandbox until verified Business account |
| `DEMO_CUSTOMER_EMAIL/PASSWORD`, `DEMO_PRO_EMAIL/PASSWORD` | seeded demo accounts (server-only sign-in) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | optional, map falls back gracefully |

Leave **UNSET**: `DEMO_MODE` (production boots real when unset; setting it forces mock),
`ASSETLINKS_SHA256_FINGERPRINTS` (Play signing only), `STRIPE_*` (US-only, skip in SV).

Verify: deploy log must NOT contain `[tasklens] production boot refused`.
Then: `/api/health` → ok; `/scan` → `/quote` returns `"mock": false`;
`/book` persists a real `jobs` row in Supabase.

## 2. Fix: account confirmation emails never arrive (do this in Supabase)

Symptom: signup → "check your email" → nothing arrives (not even spam).

Root causes, in order of likelihood:

1. **Redirect URL not allowlisted** → Supabase refuses to send.
   Supabase Dashboard → **Auth → URL Configuration**:
   - Site URL: `https://tasklen.netlify.app`
   - Additional Redirect URLs (one per line):
     - `https://tasklen.netlify.app/auth/callback`
     - `https://tasklen.netlify.app/**`
     - `http://localhost:3000/auth/callback` (dev)
2. **Default Supabase SMTP is rate-limited / spam-foldered.**
   Pick ONE:
   - (a) Fastest for judging: **Auth → Providers → Email → Confirm email: OFF**.
     Accounts work instantly, no email needed. (Password login then needs no email at all.)
   - (b) Production-correct: keep Confirm-email ON + set **Auth → SMTP Settings → Custom SMTP**
     (Resend/Postmark/Gmail app-password as sender). Then test signup with a real inbox.
   - Either way, users now have the **Password tab (default)** in `/login` + `/signup`:
     login never needs an email; only first signup may need the confirmation link.
3. **Rate limits**: Auth → Rate Limits → check blocked `otp`/`signup` events in
   **Auth → Logs**. The UI now surfaces the real Supabase error text + a
   "check spam / resend" hint instead of a generic failure.

SQL already applied (migration `014_auth_onboarding`): every new `auth.users` row gets
a `profiles` row via trigger, so password signups land as `customer` and approved
pro applicants are promoted to `pro` automatically.

## 3. Demo video

- Live on `/#demo`: `https://www.youtube.com/watch?v=7U4Fy3_roUI` (nocookie embed).
- To swap without a deploy: set `NEXT_PUBLIC_DEMO_VIDEO_URL` to the new YouTube URL in Netlify.

## 4. Real-data checklist (run once after deploy)

- [ ] `/api/health` → `{"ok":true}` (or equivalent per route).
- [ ] `/login` shows Password tab by default; create account → lands in `/signup` profile step (trigger created `profiles` row).
- [ ] `/scan` photo+voice → `/quote` with `"mock": false`, photo-specific price (mock fixture always returns the same numbers).
- [ ] `/book` → real `jobs` + `job_events` rows; PayPal sandbox hold (no real money).
- [ ] `/admin` reset only with admin role.
- [ ] No `mock` badges in quote/book/verify responses; no `Datos de demostración` labels left.
