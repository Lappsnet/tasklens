# TaskLens

Look at a home problem through glasses or a phone camera, say what you see, and get an AI job spec, price range and matched pro — with escrow held until Muse Spark verifies the finished work.

**The problem:** getting a small home repair done means describing the issue over the phone, waiting for callbacks, haggling over price, paying upfront, and hoping the work is good. TaskLens collapses that into one flow: point the camera, speak, approve a quote, and the payment is only released when AI verification passes.

## 60-second GIF
![TaskLens demo](apps/web/public/demo.gif)
Record it with the shot-by-shot script in [DEMO.md](DEMO.md) (mock mode — no API keys needed).

## Architecture
```
phone / glasses ──photo+voice──▶ Next.js 15 (apps/web)
                                        │  /api/scan → scanToSpec (Muse Spark 1.3)
                                        │  /api/match /api/book (agent loop + Stripe TEST hold)
                                        │  pro job mode → /api/jobs/* (transitions, notes, photos)
                                        │  /api/jobs/verify (pass → capture, review → resubmit)
                                        ▼
packages/ai (Muse client, prompts, Zod contracts) ──▶ Muse Model API
packages/db (Supabase Postgres + RLS, seed 25 pros) ◀──▶ Supabase (Auth, Realtime, Storage)
apps/glasses-android (Kotlin thin companion, Mock Device Kit → GlassesUploader)
```

## Meta tech used
- Muse Spark (`muse-spark-1.3`, fallback 1.2) via Model API `https://api.meta.ai/v1`, OpenAI SDK, `response_format: json_schema`
- Muse Voice Transcribe (`muse-voice-transcribe-1.0`): `POST /v1/asr/transcribe`, `wss://api.meta.ai/v1/asr/realtime`
- Muse Image (`muse-image-1.0`): `POST /v1/images/generations`, `POST /v1/images/edits`
- SAM 3.1 (`sam-3.1`): `POST /v1/responses` streamed — NOT a separate endpoint; `ai_spec.damage_box` overlay is the guaranteed fallback

## Setup (5 commands)
```sh
cp .env.example .env        # fill keys (see table)
pnpm install
pnpm --filter @tasklens/ai build
pnpm --filter web dev       # http://localhost:3000
pnpm --filter @tasklens/ai cli -- --mock
```

## Env vars
| Var | Used by | Secret? |
|---|---|---|
| MODEL_API_KEY | packages/ai, web API routes | yes (server-only) |
| MODEL_BASE_URL | ai | no (default https://api.meta.ai/v1) |
| MODEL_ID / MODEL_FALLBACK_ID | ai | no |
| ASR_MODEL / IMAGE_MODEL / SAM_MODEL | ai | no |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | web | public |
| SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_URL | migrations/seed, server routes | yes |
| STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET | web Day 3 | yes |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | web | public |
| NEXT_PUBLIC_MAPBOX_TOKEN | web Day 3 | public |
