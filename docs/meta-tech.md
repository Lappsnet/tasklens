# TaskLens — Meta tech used

Every entry below names the Meta product, where it runs in the codebase, and
what it does for the user. No other AI vendor is used.

## Muse Spark (`muse-spark-1.3`, fallback `muse-spark-1.2`)

OpenAI-compatible client (`packages/ai/src/client.ts`, base URL
`https://api.meta.ai/v1`, `Authorization: Bearer $MODEL_API_KEY`), image
input, tool calling, JSON-schema output. 30 s timeout, one validation retry.

| Call | Code | Screen |
|---|---|---|
| `scanToSpec(images[], transcript, lang)` → `AiSpec` (category, diagnosis, urgency, hours, materials, price range, steps, safety flags, `damage_box`, confidence) | `packages/ai/src/muse.ts`, prompt `prompts/scan.md` | `/scan` → `/quote` |
| `verifyCompletion(before[], after[], spec)` → `{pass\|review, checks[], summary}` | `muse.ts`, `prompts/verify.md` | `POST /api/jobs/verify`, pro + customer views |
| `matchAndBook` agent loop (`search_pros`, `get_availability`, `create_booking`) | `packages/ai/src/match.ts`, `prompts/match.md` | `/book` |
| `answerCopilot(question, spec, frame?)` → short spoken answer + safety note | `packages/ai/src/copilot.ts`, `prompts/copilot.md` | job mode (S8) |
| `watchHazards(spec, frameNote)` → advisory `{safe, hazards[], warning}` | `copilot.ts`, `prompts/copilot.md` | job mode hazard watch (S8) |
| Contract draft + 5-line bilingual summary (`ContractDraft`) | `contracts.ts`, `contracts/clauses/*.md` (8 fixed files) | `/contracts/[jobId]` (S1) |
| Change orders, slot suggestions, day plans, project plans, funding-free mediation proposals, city triage, maintenance radar, ES/EN chat translation | `contracts.ts`, `schedule.ts`, `projects.ts`, `mediator.ts`, `city.ts`, `home.ts` | calendar, projects, disputes, `/city`, passport, job chat |

Keyless runs use deterministic mocks (`mockScanSpec`, `mockVerifyResult`, …)
so the full loop works with zero keys; real paths engage automatically.

## Muse Voice Transcribe (`muse-voice-transcribe-1.0`)

`POST /v1/asr/transcribe` multipart (`request` JSON + audio), implemented in
`POST /api/transcribe` and `POST /api/jobs/note` via `transcribeBuffer()`.
Used for scan narration, pro voice notes, and Copilot voice questions.
Realtime WebSocket (`wss://api.meta.ai/v1/asr/realtime`) is the documented
fallback if the file endpoint fails (not yet needed; logged in `CUT.md` if used).

## Muse Image

`POST /v1/images/edits` in `previewAfter()` (`muse.ts`) → "after" renders on
the quote screen (`POST /api/jobs/preview`, `preview: null` mock until keyed)
and 3 finish options in Project Planner (`S4`). OG card route falls back to a
generated card until a key exists.

## SAM 3.1 (damage segmentation)

Via the Model API Responses API (`model sam-3.1`, `POST /v1/responses`,
streamed) in `segmentDamage()` — never a standalone endpoint (see `CUT.md`).
Best-effort inside verification with a 15 s cap; the spec `damage_box` overlay
is the guaranteed fallback, so the flow never blocks.

## Ray-Ban Meta glasses (Wearables Device Access Toolkit)

`apps/glasses-android`: real Android Studio project (Kotlin + Compose) —
"Fix this" → capture → authenticated `POST /api/glasses/upload` → spoken
summary via phone-speaker TTS → deep link to the quote; job mode runs
hands-free with Copilot Q&A and hazard watch. Developed against the Mock
Device Kit first (bundled sample photo, honestly labelled); the real pair path
is a documented seam, distributed via the Wearables Developer Center channel.
The Play-store TWA build contains no Wearables code by construction.

## Measured latency (mock, local)

Phone scan → quote ~0.9 s; full loop ×2 ~2.6–5 s; admin reset < 5 s.
Keyed latencies (10 fixture photos, target p95 scan→quote < 15 s) will be
recorded in `PROGRESS.md` once the owner provides `MODEL_API_KEY`.
