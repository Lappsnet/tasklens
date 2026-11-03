# TaskLens

**Look at a home problem through glasses or a phone camera, say what you see, and get an AI job spec, price range, and a matched pro — with payment held in escrow until AI verifies the finished work.**

## The pain, the market, the solution

**The pain is universal, but in Latin America it hurts more.** A leaking pipe, a burnt outlet, a broken lock: today fixing it means describing the problem over the phone, waiting days for someone to come look, getting a price only after the visit, paying upfront in cash, and hoping the work is good. There is no quote before the visit, no guarantee behind the payment, and no record afterwards. Trust runs on word of mouth; risk sits entirely with the household.

**The market is huge and almost entirely informal.** Millions of households across El Salvador, Guatemala, Honduras and the rest of the region need plumbing, electrical, masonry, assembly and cleaning work every month, served by independent pros with no storefront, no booking system and no payment protection. Municipalities face the same problem at city scale: citizen reports pile up in a central office with no triage, no dispatch and no public proof of resolution. Whoever turns this informal flow into a trusted, documented transaction — quote before visit, money held until verified, every job on record — captures both the household market and the municipal one. (Quantified market figures are intentionally omitted here: any number shown publicly needs a sourced citation from the owner — see `UI_UX_PROMPT.md` content rules.)

**TaskLens is that transaction.** Point the camera (Ray-Ban Meta glasses or any phone), describe the problem out loud, and Muse Spark turns frames + voice into a structured job spec with a conservative price range and materials list. An agent loop matches a verified pro, you confirm explicitly, and the payment is **authorized but not captured** — it is released only when AI compares before/after photos and passes the job. The pro works hands-free with a glasses copilot; the customer watches everything live; the finished job lands in a Home Passport with warranties. No visit to get a price. No upfront cash. No "he said, she said" — the evidence is in the log.

## 60-second GIF

![TaskLens demo](apps/web/public/demo.gif)

Record it with the shot-by-shot script in [DEMO.md](DEMO.md) (mock mode — no API keys needed). The 3-minute narrated version for non-technical viewers is storyboarded in [DEMO_VIDEO.md](DEMO_VIDEO.md).

## How it works (core loop)

```
scan → quote → match → book + hold → pro accepts → job mode
  → before/after photos → AI verification → release payment → rating
   quoted → booked → en_route → in_progress → pending_verify → completed
```

Every transition is a guarded state-machine step (illegal jumps return 409), every step/note/photo/rating is an event in the job log, and the customer watches it all live with polling fallback where Realtime is unavailable.

## Architecture

```
┌─ Clients ─────────────────────────────────────────────┐
│ PWA (Next.js, mobile-first, EN/ES)                     │
│ Android TWA wrapper (Play build, no Wearables SDK)    │
│ Glasses companion (Kotlin; Mock Device Kit →          │
│   Wearables Device Kit release channel): capture,      │
│   upload, TTS replies, deep link back to quote         │
└──────────────┬────────────────────────┬───────────────┘
               │ photo + voice          │ status photos        │
               ▼                        ▼
┌─ apps/web (Next.js 15 App Router) ────────────────────┐
│ Pages: / /scan /quote/[id] /book/[id] /jobs/[id]     │
│   /pro /pro/jobs/[id] /empresa /city /admin /auth     │
│ API: /api/scan /api/transcribe /api/match /api/book   │
│   /api/jobs/* (transition|step|note|photos|verify)     │
│   /api/copilot/* /api/contracts/* /api/city/*         │
│   /api/pay/* /api/funding/* /api/disputes/*           │
│ Middleware: security headers + env-aware CSP, session │
│ refresh (skips prefetches/static)                     │
└──┬──────────────┬──────────────┬──────────────┬───────┘
   │ Zod-validated│ Supabase     │ PayPal       │ Mapbox
   ▼              ▼ client      ▼ Orders v2    ▼ pins
┌─ packages/ai ──┐ ┌─ Supabase ─┐ ┌─ escrow ────┐
│ Muse client    │ │ Postgres + │ │ AUTHORIZE = │
│ (openai SDK →  │ │ RLS (deny  │ │ hold; capture│
│ api.meta.ai)    │ │ default)   │ │ only on pass │
│ scanToSpec     │ │ Auth (magic│ │ Stripe = 2nd │
│ matchAndBook   │ │ link+demo) │ │ adapter (US) │
│ verifyComplete │ │ Storage:   │ └─────────────┘
│ transcribe     │ │ media (pvt,│
│ previewAfter   │ │ signed URL)│  Map: pro pins,
│ copilot/hazard │ │ Realtime:  │  route map
│ mediator/sched │ │ jobs,events│
└──┬─────────────┘ └────────────┘
   │ OpenAI-compatible calls, JSON out, tool calling
   ▼
┌─ Meta APIs (dev.meta.ai/docs wins on conflicts) ──────┐
│ muse-spark-1.3 (1.2 fallback): spec, match, verify,  │
│   copilot, triage, planner, mediator, contracts       │
│ muse-voice-transcribe-1.0: POST /v1/asr/transcribe,   │
│   wss realtime fallback                               │
│ muse-image-1.0: "after" preview from scan photo       │
│ sam-3.1: damage mask via /v1/responses (streamed);    │
│   ai_spec.damage_box overlay is the guaranteed fallback│
│ Wearables Device Access Toolkit (companion app only)  │
└───────────────────────────────────────────────────────┘
```

Key files: `packages/ai/src/*.ts` (agents), `packages/ai/prompts/*.md` (versioned prompts), `packages/ai/src/schemas.ts` (Zod contracts), `apps/web/lib/payments/` (provider interface), `apps/web/lib/scan-pipeline.ts` (shared phone/glasses upload path), `packages/db/migrations/001–017` + `src/queries.ts`.

## Meta tech used

| Meta tool | Where in TaskLens | Endpoint / model |
|---|---|---|
| Muse Spark | scan→spec, match top-3, verify pass/review, copilot Q&A, city triage, slot suggestions, project planner, mediator, contract drafts | `muse-spark-1.3` (fallback `1.2`) via `https://api.meta.ai/v1`, OpenAI SDK, JSON output, tool calling |
| Muse Voice Transcribe | scan narration, job voice notes, copilot questions (ES+EN) | `muse-voice-transcribe-1.0`: `POST /v1/asr/transcribe`, `wss://…/asr/realtime` fallback |
| Muse Image | "after" preview on quote | `muse-image-1.0`: images edits from the scan photo |
| SAM 3.1 | damage highlight on scan/quote photos | `sam-3.1` via `POST /v1/responses` (streamed); `damage_box` fallback always drawn |
| Ray-Ban Meta glasses | capture + Bluetooth-mic voice + spoken replies via companion app | Wearables Device Access Toolkit (Android companion; Mock Device Kit for dev) |

Full inventory with latencies: [`docs/meta-tech.md`](docs/meta-tech.md). Data flow: [`docs/architecture.md`](docs/architecture.md).

## AI agents and what each automates

| Agent | Input → Output | Automation & guardrails |
|---|---|---|
| `scanToSpec` | photos + transcript → job spec + price range + materials + safety flags | Conservative pricing; gas/live-wiring/structural → licensed-pro flag; confidence < 0.5 asks questions instead of quoting |
| `matchAndBook` | spec + location → top 3 pros + reasons | Tool loop (`search_pros`, `get_availability`, `create_booking`); **never books without explicit customer confirmation** (triple-gated in code) |
| `verifyCompletion` | before/after + spec → `pass`/`review` + per-step checks | Only `pass` captures payment; `review` reopens for fix + resubmit |
| Pro Copilot | spec + voice question / live frame → answer, hazard note, step evidence | Spoken answers logged; hazard watch is advisory-only (60s toggle, never certifies) |
| Fair-fix mediator | contract + change orders + verification → `redo` / `partial_release` | AI proposes; money moves only on other-party/admin accept |
| Support (triage, schedule, planner, contracts) | reports/video/scope → severities, slots, phases, drafts | City SLA triage, AI slot stars, video→crew plan, fixed-clause bilingual contracts |

Every model output is Zod-validated (one retry with the error, then a friendly failure); amounts are computed server-side; model calls have 30s timeouts.

## Roles

| UI name | Key | Home |
|---|---|---|
| Cliente | `customer` | `/inicio` — scan hero, live jobs, passport, spend chart |
| Profesional | `pro` | `/pro` — day plan, requests, earnings, trust |
| Empresa | `company` | `/empresa` — panel, dispatch, team, revenue |
| Alcaldía | `city_operator` | `/city` — map, triage queue, SLAs, contractors |
| Admin | `admin` | `/admin` — verifications, demo reset, health |

Auth: Supabase magic link + demo login; glasses pair via 6-char code + QR + live status (`glasses_pairings`). RLS default-deny; customers see only their scans/jobs/payments; pros only assigned jobs.

## Data model

`profiles`, `pros`, `availability`, `scans`, `jobs`, `job_events`, `payments` (+ escrow/payouts), `contracts`, `companies(+members)`, `city_reports`, `pro_applications`, `glasses_pairings`, `city_access_requests`. Job status: `quoted → booked → en_route → in_progress → pending_verify → completed` (`disputed` via mediator). Migrations `001–017` + seed of 25 SV pros; Storage bucket `media` (private, signed URLs).

## Setup (5 commands)

```sh
cp .env.example apps/web/.env.local   # fill keys (table below)
pnpm install
pnpm --filter web typecheck           # verify the tree
pnpm --filter web dev                 # http://localhost:3000
node scripts/check-env.mjs            # names only, never prints values
```

## Env vars

| Var | Used by | Secret? |
|---|---|---|
| `MODEL_API_KEY` | all AI agents (server routes only) | yes, server-only |
| `MODEL_BASE_URL` | ai client (default `https://api.meta.ai/v1`) | no |
| `MODEL_ID` / `MODEL_FALLBACK_ID` | ai client | no |
| `ASR_MODEL` / `IMAGE_MODEL` / `SAM_MODEL` | transcribe / preview / SAM | no |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web client | public |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` | migrations, seed, server-only paths | yes |
| `STORAGE_BUCKET` | media uploads (`media`) | no |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` | escrow hold/capture + webhook verify | yes (secret, webhook id) |
| `PAYPAL_ENV` | `sandbox` until verified Business account, then `live` | no |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal buttons (must equal client id) | public |
| `PLATFORM_FEE_PCT` | fee math (default 10) | no |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | secondary adapter, US only | yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe buttons | public |
| `DEMO_CUSTOMER_EMAIL/PASSWORD`, `DEMO_PRO_EMAIL/PASSWORD` | seeded demo login (server-only sign-in) | yes |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | pro/route maps | public |
| `NEXT_PUBLIC_APP_URL` | links, metadata, callbacks | no |
| `NEXT_PUBLIC_DEMO_VIDEO_URL` | landing demo block override | no |
| `ASSETLINKS_SHA256_FINGERPRINTS` | Play app-signing, set after signing | no |
| `DEMO_MODE` | local mock paths only — **never set in production** | n/a |

Exact sources per key: [`docs/vercel-env-vars.md`](docs/vercel-env-vars.md) (works for any host, not just Vercel).

## Status, docs, security

* Progress log: [`PROGRESS.md`](PROGRESS.md) · decisions: [`DECISIONS.md`](DECISIONS.md) · cuts: [`CUT.md`](CUT.md) · architecture: [`docs/architecture.md`](docs/architecture.md) · keyed go-live gate: [`docs/keyed-verification.md`](docs/keyed-verification.md).
* Security: RLS everywhere before data; server-side session + role checks on all API routes; Zod at every boundary; uploads limited to image/audio ≤10 MB with random names; rate-limited scan/book/auth; CSP + hardening headers; `pnpm audit` before each deploy.
* Conventions: Turborepo + pnpm, TypeScript `strict`, Conventional Commits, never leave `main` broken.
