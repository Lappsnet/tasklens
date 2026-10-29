# TaskLens — keyed verification runbook (production go-live gate)

Run on the deployed Vercel URL with real keys. Two phones (A = customer,
B = pro), zero manual DB edits. Record latencies in `PROGRESS.md`.

## 0. Preconditions (owner)

- [ ] Migrations `001`→`014` applied; `media` bucket private; types generated.
- [ ] Vercel env set (see `docs/production-launch.md` §2), redeployed, boot OK
      (no `[tasklens] production boot refused` in logs).
- [ ] PayPal **sandbox** keys; sandbox business + buyer accounts exist.
- [ ] `MODEL_API_KEY` set. `pnpm audit` clean except known zod.

## 1. Auth + RLS (phone A + dashboard, ~10 min)

1. A: open `/login` → magic link → signed in as customer (profile auto-created
   by the `014` trigger — check `profiles` has the row, role `customer`).
2. B: apply at `/pro/apply` (real email B can receive) → admin approves at
   `/admin/pros` → B signs in via magic link → `profiles.role = 'pro'` and
   `pros.user_id` set (trigger backfill; if B signed in *before* approval,
   approve-time linking covers it — verify one path each across the two runs).
3. **Negative tests** (must all fail closed):
   - A fetches `/api/jobs?id=<B-only-job>` → no access (RLS + `visibleJobs`).
   - B (customer role) POSTs `/api/admin/reset` → 403.
   - `demo-customer` cookie login on production → impossible (no demo paths).
   - Direct Supabase anon read of `payments`/`job_events` for another user's
     job → 0 rows.

## 2. Core loop ×2 (two phones, ~15 min)

Phone A (customer, ES) and phone B (pro), different jobs:

1. A: `/scan` → live photo + hold-to-talk → `/quote` in **< 15 s** (record).
   Confirm SAM mask or `damage_box` fallback, price hero, materials, safety flags.
2. A: `/book` → map + 3 pros + slot chips → PayPal sandbox buyer pays by card →
   `booked`, payment `held` (record authorization id).
3. B: `/pro/jobs/[id]` → en route → in progress → ask Copilot a question aloud
   (answer spoken + logged) → "listo" frame on one step → after photos → verify.
4. A watches `/jobs/[id]` live: steps, copilot answer, evidence thumbnail,
   verification checks turning green, payment `released`, pro payout row.
5. A rates 5★ → pro average updates.
6. Repeat with roles/languages swapped (B customer EN, A pro ES).

## 3. Endpoint fallbacks (agent, during §2)

- `transcribe` / `previewAfter` / `segmentDamage` / `scanToSpec` against the
  real key. If `dev.meta.ai/docs` disagrees with our shapes: docs win, log in
  `DECISIONS.md`. Fallbacks (already coded): realtime ASR socket, `damage_box`,
  `preview: null`, SAM skipped.
- If any Meta API blocks > 45 min: cut per `CUT.md`, never fake it in the video.

## 4. Money checks (PayPal dashboard + DB)

- Authorization `AUTHORIZE` → capture only after `pass`; `review` stays held.
- `payments` row: `held` → `released`; `payouts` row: amount minus 10% fee.
- Refund/void path: dispute → void authorization, no capture.
- Record: full-loop wall time ×2, scan→quote p95, capture latency.

## 5. Sign-off

- [ ] Loops ×2 green, no manual DB edits; RLS negatives closed.
- [ ] Latencies in `PROGRESS.md`; endpoint deviations in `DECISIONS.md`.
- [ ] Flip `PAYPAL_ENV=live` only after verified Business account (no deploy).
