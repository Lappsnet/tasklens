# TaskLens — production launch checklist

Goal: a fully functional product on production. Code is done (ai 37/37, web
75/75, build green); everything below is keys, infra, verification, and assets.
Owner steps are marked OWNER. Do in order — each unblocks the next.

## 0. Pre-flight (code, done)

- [x] Full loop ×2 in mock, no manual DB edits; 55/55 routes gated or
      intentionally public; security review PASS (`docs/security-review.md`).
- [x] `.env.example` covers every `process.env.*` the code reads (audited
      2026-10-29). No `vercel.json` needed — deploy via Vercel dashboard git
      integration.

## 1. Supabase project (OWNER, ~1 h, unblocks everything)

1. Create project (region closest to SV/GT users), save URL + anon + service
   role keys.
2. Apply migrations in order: `packages/db/migrations/001` → `014`
   (schema, seed ES+Miami keepers, RLS lockdown, rate limits, PayPal escrow,
   contracts, calendar, passport, ratings, projects, funding/disputes, city,
   pro applications, **auth onboarding trigger**).
3. Create private Storage bucket `media` (RLS default deny; server uses
   service role + 60 s signed URLs — already coded).
4. `supabase gen types typescript --linked > packages/db/src/types.ts`
   (currently a placeholder).
5. Create demo users + run `packages/db/scripts/seed-demo-users.ts`
   (customer, pro; admin is never one-click).
6. Dashboard → Auth: enable magic-link OTP + set SMTP sender (magic links are
   the only email the app sends itself — see §4).

## 2. Keys + Vercel env (OWNER, ~1 h)

Set in the Vercel project (production env), then redeploy:

- `MODEL_API_KEY` (+ optional `MODEL_BASE_URL`, `MODEL_ID`,
  `ASR_MODEL`, `IMAGE_MODEL`, `SAM_MODEL`).
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET=media`.
- PayPal sandbox first: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
  `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=sandbox`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
  (= same client id), `PLATFORM_FEE_PCT=10`.
- `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_APP_URL=https://<prod>`.
- Demo accounts: `DEMO_CUSTOMER_EMAIL/PASSWORD`, `DEMO_PRO_EMAIL/PASSWORD`.
- Do NOT set `DEMO_MODE` (production boot refuses demo paths; verified in
  `lib/env.ts` + `instrumentation.ts`).
- Later, after Play signing: `ASSETLINKS_SHA256_FINGERPRINTS`, then redeploy.

## 3. Keyed verification (OWNER + agent, ~2 h, the real go-live gate)

On the deployed URL, with keys: full loop TWICE from two different phones,
zero manual DB edits; record latency + pass rate in `PROGRESS.md`:

1. Scan (photo + voice) → quote < 15 s (p95 target).
2. `transcribe`, `previewAfter`, `segmentDamage` against the real endpoints —
   if `dev.meta.ai/docs` disagrees with our shapes, docs win, log in
   `DECISIONS.md` (fallback: realtime ASR socket, `damage_box`, preview=null).
3. PayPal sandbox buyer pays by card → hold → verify pass → capture →
   pro sees payout row.
4. Flip `PAYPAL_ENV=live` only after a verified PayPal **Business** account
   (no code change). Note: authorizations last 3 days — jobs booked further
   out reauthorize 24 h before the slot (coded in reschedule flow).

## 4. Known functional gaps (decide before calling it "fully functional")

1. **Transactional email** (booking/en-route/completed/reminder): NOT built.
   The app sends only Supabase magic-link OTPs. Options: (a) ship without —
   in-app timeline + WhatsApp share links cover the demo; (b) add a provider
   (agent must ask first per AGENTS.md — e.g. Resend). Recommend (a) for the
   hackathon, (b) after.
2. **PayPal Payouts** (pro withdrawals): ledger only (`pending`), real Payouts
   API behind a flag pending PayPal approval. Pros see pending balances —
   fine for demo, needs approval + ops process for real money-out.
3. **ICS attachments "on every booking email"**: blocked on (1); ICS
   subscribe feeds themselves work.
4. **Business accounts (teams)**: deferred to `CUT.md` — S4 crew booking
   covers the demo story.

## 5. Mobile + glasses builds (OWNER machines, parallel with §3)

- **TWA**: needs JDK + Android SDK (absent here): Bubblewrap build of
  `apps/android-twa` → signed AAB → Play internal → closed testing by Oct 31.
  After Play app-signing, paste SHA-256 into Vercel env (§2) and redeploy so
  `/.well-known/assetlinks.json` serves it (fails closed until then, by design).
  Install on a real phone, confirm no browser bar; store screenshots pending.
- **Glasses**: `./gradlew assembleDebug` on a JDK machine (wrapper files are
  in the owner's tree, uncommitted). Real pairing via Meta AI app + Wearables
  Developer Center channel; Mock Device Kit path already ships.

## 6. Demo assets + submit (OWNER, before Nov 4 12:00 UTC-6; freeze Nov 2 20:00)

- `docs/screens/` 375 px screenshots (P0-3 requirement, empty dir today),
  store graphics (`docs/store/`), `demo.gif` via `DEMO.md` (60 s script),
  README GIF slot, flip repo public.
- Final regression before freeze: tests + typecheck + build + `pnpm audit`,
  full loop ×2 on production.

## 7. Top risks

1. Supabase code paths have never run against a live DB (memory-tested only):
   RLS policies, Realtime, `rate_limit_hit()` RPC, Storage sign/upload. §3 must
   include one RLS-negative test (customer B cannot read customer A's job).
2. Meta endpoint shapes unverified with a real key (4 endpoints) — budget time
   for doc-driven fixes.
3. Real-money flip (PayPal live, Payouts approval) is an ops process, not code —
   start approval early.
