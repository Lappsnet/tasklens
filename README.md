# TaskLens

Hackathon MVP: look at a home problem through glasses/phone camera + speak → AI job spec + price → matched pro → escrow → verified completion.

## 60-second GIF
(TODO Day 7)

## Architecture
- `apps/web` — Next.js 15 PWA + API routes (server-only keys)
- `packages/ai` — Muse client, prompts, Zod schemas, scanToSpec/match/verify/transcribe/preview
- `packages/db` — Supabase migrations + seed + queries
- `apps/glasses-android` — Kotlin/Compose thin companion (Mock Device Kit Day 1)

## Meta tech used
- Muse Spark (`muse-spark-1.3`, fallback 1.2) via Model API `https://api.meta.ai/v1`, OpenAI SDK, `response_format: json_schema`
- Muse Voice Transcribe (`muse-voice-transcribe-1.0`): `POST /v1/asr/transcribe`, `wss://api.meta.ai/v1/asr/realtime`
- Muse Image (`muse-image-1.0`): `POST /v1/images/generations`, `POST /v1/images/edits`
- SAM 3.1 (`sam-3.1`): `POST /v1/responses` streamed — NOT a separate $SAM_ENDPOINT_URL

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
