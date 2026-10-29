# TaskLens — architecture

Mobile-first PWA (`apps/web`, Next.js 15 App Router) + thin Android companion
(`apps/glasses-android`) + Meta-model layer (`packages/ai`) + Supabase backend.
Turborepo + pnpm, TypeScript `strict` everywhere.

## Runtime layout

```
phone / glasses → Next.js route handlers (/api/*) → packages/ai → api.meta.ai
                                              ├→ Supabase (Postgres + RLS, Auth, private Storage `media`, Realtime)
                                              └→ PayPal Orders v2 (AUTHORIZE escrow) / Stripe manual-capture
```

- Web reads/writes through server route handlers only. `@tasklens/ai` is a
  server-external (never bundled: it reads `prompts/*.md` via `fs`).
- Persistence rule (P0-1): Supabase when configured, per-process memory stores
  only for `pnpm test` and `DEMO_MODE=true`. Production boots fail without
  Supabase or `MODEL_API_KEY`.
- Realtime: Supabase Realtime on `jobs`/`job_events` when configured, 2 s
  polling fallback otherwise (`useJobFeed`, live badge).

## Core loop (the money path)

`scan → quote → match → book + hold → pro accepts → job mode → before/after →
AI verification → release → rating`, all twice end-to-end with no manual DB edits.

| Step | Route | What happens |
|---|---|---|
| Scan | `POST /api/scan`, `/api/transcribe` | photos + voice → `scanToSpec()` → Zod `AiSpec` → scan row |
| Quote | `/quote/[scanId]` | SAM mask or `damage_box` overlay, price hero, Muse Image preview (keyed) |
| Match | `POST /api/match` | agent loop: `search_pros` → `get_availability` → top 3, one-line reasons |
| Book + hold | `POST /api/book`, `/api/pay/hold` | triple-gated (literal `confirm`, recomputed top-3, offered slot) → PayPal AUTHORIZE / Stripe manual capture, amount server-side |
| Job mode | `/pro/jobs/[id]` ↔ `/jobs/[id]` | state machine `booked→en_route→in_progress→pending_verify` (409 otherwise), checklist/step/voice/photo events, S8 Copilot |
| Verify | `POST /api/jobs/verify` | `verifyCompletion()` → `pass`: complete + capture + payout ledger + Passport entry; `review`: stays pending |
| Rating | `POST /api/ratings` | 1–5 + comment, pro average recomputed server-side |

## Signature layers (Phase 3)

- **S1 Contract Studio**: fixed clause library → Muse fills `{placeholders}` →
  Zod `ContractDraft` → typed + drawn e-sign + email OTP → SHA-256 hashed PDF.
  Escrow only after both signatures; change orders = extra authorizations.
- **S2 Smart Calendar**: AI slot suggestions (urgency + availability + Mapbox
  travel), spoken day plan, private ICS feeds (hash-only tokens), mutual-approval
  reschedule with PayPal re-auth past 3 days.
- **S3 Home Passport**: every verified job writes an entry (before/after,
  contract, materials, warranty) + AI maintenance radar + warranty-claim rebooks.
- **S4 Project Planner**: walkthrough frames → phased `ProjectPlan` → Muse Image
  renders → one pro per trade → per-phase milestone escrow.
- **S5 Pay from abroad**: single-use 72 h funding links (hash-only tokens,
  title/price only, never address/phone).
- **S6 Fair-fix mediator**: Muse compares scope + change orders + checks →
  redo / partial capture; AI proposes, humans (or admin) dispose.
- **S7 TaskLens for Cities**: city-fenced public reports, AI triage + SLA,
  operator dispatch, duplicate clustering.
- **S8 Pro Copilot**: spec-grounded Q&A with spoken answers, advisory hazard
  watch, "listo" frame evidence feeding verification.

## Data model

`profiles`, `pros`, `availability`, `scans`, `jobs` (`quoted…disputed`),
`job_events`, `payments`, `payouts`, `contracts`, `contract_signatures`,
`change_orders`, `calendar_blocks`, `calendar_feeds`, `homes`, `home_members`,
`passport_entries`, `warranties`, `reminders`, `projects`, `project_phases`,
`phase_dependencies`, `funding_links`, `disputes`, `dispute_proposals`,
`public_reports`, `report_clusters`, `pro_applications`, `rate_limits`.
Migrations `001`–`013` in `packages/db/migrations/`, each with RLS in-file.

## Cross-cutting rules

- Zod at every API boundary; one model retry with the validation error, then a
  friendly error. 30 s model timeouts. Prompts versioned in `packages/ai/prompts/*.md`.
- Money moves only in server code, only after signatures/verdicts/acceptances.
- Tokens (ICS, funding, passport share) are 32-byte random, hash-only, expirable.
- Feature flags guard P1/stretch; `/admin` reset restores the seed in < 5 s.
