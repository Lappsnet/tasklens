# AGENTS.md — TaskLens

Read this file before every task. It is the source of truth for how this repo is built.
If a request conflicts with this file, stop and ask the owner.

## 1. Mission
TaskLens is a TaskRabbit-style marketplace for repairs, small construction, assembly,
cleaning and appointment-based home services. Customers scope a job by LOOKING at the
problem through Ray-Ban Meta glasses (or a phone camera) and SPEAKING. Muse Spark turns
frames + voice into a structured job spec, price range and materials list, then books a
matching pro. Pros use the glasses on the job for a hands-free checklist, voice notes and
before/after photos that Muse Spark verifies before escrow is released.

Hackathon: Meta Global AI Developer Hackathon 2026.
Hard deadline: Wed Nov 4 2026, 7:00 PM UTC-6. Target submit: Nov 4, 12:00 PM UTC-6.
Feature freeze: Mon Nov 2, 8:00 PM UTC-6.

## 2. Core loop (must work end to end, twice in a row, no manual DB edits)
scan -> quote -> match -> book + hold payment -> pro accepts -> job mode
-> before/after photos -> AI verification -> release payment -> rating

## 3. Meta tech
Verify every endpoint against https://dev.meta.ai/docs before use. If the docs disagree
with this file, the docs win; note the change in DECISIONS.md.
- Meta Model API: base URL https://api.meta.ai/v1, header `Authorization: Bearer $MODEL_API_KEY`,
  OpenAI-compatible. Use the official `openai` npm SDK with `baseURL` set.
  Model: `muse-spark-1.3` (fallback `muse-spark-1.2`). Use image input, tool calling, JSON output.
- Muse Voice Transcribe (`muse-voice-transcribe-1.0`): speech-to-text, English + Spanish.
  The code uses `POST /v1/asr/transcribe`; verify it with a real key. If it fails, stream
  audio over the realtime WebSocket `wss://api.meta.ai/v1/asr/realtime`.
- Muse Image: "after" preview generated from the scan photo.
- SAM 3.1: damage segmentation via `$SAM_ENDPOINT_URL`. If unavailable, draw
  `ai_spec.damage_box`. Never block the flow on SAM.
- Meta Wearables Device Access Toolkit: native companion app on ONE platform only
  (owner confirms Android/Kotlin+Compose or iOS/Swift+SwiftUI). Captures glasses photos,
  records voice over the Bluetooth mic, uploads to our API, speaks replies with on-phone TTS.
  Develop against the Mock Device Kit first, then real glasses.

## 4. Stack (do not substitute without asking)
- Monorepo: Turborepo + pnpm, TypeScript `strict` everywhere.
- `apps/web`: Next.js 15 App Router, Tailwind, shadcn/ui, React Query, Zustand. Mobile-first PWA.
  Routes: `/`, `/scan`, `/quote/[scanId]`, `/book/[scanId]`, `/jobs/[jobId]`, `/pro`,
  `/pro/jobs/[jobId]`, `/admin`. API in route handlers under `/api`.
- `apps/glasses`: thin native companion (capture, upload, speak, job mode).
- `packages/ai`: Muse client, prompts, Zod schemas, tool definitions, `scanToSpec()`,
  `matchAndBook()`, `verifyCompletion()`, `transcribe()`, `previewAfter()`.
- `packages/db`: generated Supabase types and queries.
- Supabase: Postgres + RLS, Auth (magic link + demo login), Storage bucket `media`,
  Realtime on `jobs` and `job_events`.
- Payments (Phase 2 decision): PayPal Orders API v2, `intent: "AUTHORIZE"` = escrow hold,
  capture on a `pass` verdict. Sandbox until the owner verifies a PayPal Business account.
  Stripe stays as a secondary adapter (US only) behind `lib/payments/` provider interface.
  Stripe does not support merchants in El Salvador.
- Mapbox GL for pro locations. Deploy web to Vercel.

## 5. Data model
Tables: `profiles`, `pros`, `availability`, `scans`, `jobs`, `job_events`, `payments`.
Job status enum: `quoted, booked, en_route, in_progress, pending_verify, completed, disputed`.
Write SQL migrations + RLS policies + a seed of 25 pros across plumbing, electrical,
appliance, drywall/paint, assembly and cleaning, with realistic rates and ratings.

## 6. AI contracts
Validate every model output with Zod. On failure, retry once with the validation error in
the prompt, then show a friendly error. Keep prompts in `packages/ai/prompts/*.md`, versioned.
1. `scanToSpec(images[], transcript, lang)` -> AiSpec { category, title, diagnosis, urgency,
   skill_level, est_hours, materials[], price_range_usd, steps[], safety_flags[],
   questions_for_customer[], damage_box, confidence }. Conservative pricing. Gas, live wiring
   or structural risk -> set `safety_flags` and recommend a licensed pro.
   If confidence < 0.5, ask questions instead of quoting.
2. `matchAndBook`: agent loop with tools `search_pros(category, lat, lng, max_km)`,
   `get_availability(pro_id, date_range)`, `create_booking(pro_id, slot, scan_id)`.
   Return top 3 pros with one-line reasons. Never book without explicit customer confirmation.
3. `verifyCompletion(before[], after[], spec)` -> { verdict: pass|review,
   checks[{ step, passed, evidence }], summary }. Only `pass` captures payment.

## 7. Security standard (non-negotiable)
Secrets
- Never commit secrets. `.env*` is in `.gitignore` from the first commit; ship `.env.example`
  with variable names only.
- Server-only keys (`MODEL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `SAM_API_KEY`) are used only in route handlers / server code, never in client bundles
  and never with a `NEXT_PUBLIC_` prefix.
- Never print secrets in logs, errors or chat output.

Auth and data access
- RLS enabled on every table before any data is written. Default deny; explicit policies per
  role. Customers see only their scans/jobs/payments; pros only jobs assigned to them.
- Every API route checks the session and the user's role server-side. Never trust IDs or
  roles sent by the client.
- Use the service role key only in server code paths that truly need it, and document why.

Input and AI safety
- Validate every request body with Zod at the API boundary.
- Uploads: allow only image/jpeg, image/png, image/webp and audio types; max 10 MB; random
  file names; private Storage bucket served via short-lived signed URLs.
- Treat all model output as untrusted: validate, never execute it, never render it as raw HTML.
- Treat user text and image content as untrusted prompt input; tools exposed to the model
  may only act on the current user's own records.

Payments
- Amounts are computed server-side from the job record, never taken from the client.
- Verify Stripe webhook signatures. Capture only after a `pass` verdict or customer approval.

Web and API hardening
- Rate-limit `/api/scan`, `/api/book` and auth endpoints.
- Set security headers (CSP, X-Frame-Options/frame-ancestors, Referrer-Policy, nosniff).
- Errors returned to clients are generic; details go to server logs without PII or secrets.

Dependencies
- Install only well-known packages; pin versions via the lockfile; run `pnpm audit` before
  each daily deploy and fix high/critical issues.

## 8. Engineering practices
- Never leave `main` broken. Small commits with clear messages (Conventional Commits).
- Feature flags for P1 and stretch features.
- Every screen has loading, empty and error states; works at 375 px; English + Spanish strings.
- Performance target: p95 scan-to-quote < 15 s with streaming progress messages.
- Model calls have 30 s timeouts and one retry.
- `/admin` "Reset demo" restores the seed story in < 5 s (admin role only).
- README: problem, demo GIF, architecture diagram, Meta tech used, setup in 5 commands,
  env var table.

## 9. Work order
Work one day at a time. At the end of each day: run the done-check, `pnpm audit`, commit,
deploy, and report what works, what was cut, and latency numbers.
- Day 1 (Oct 28): foundations, schema + RLS + seed, `scanToSpec` CLI.
  Done: valid `ai_spec` for 8 of 10 fixture photos.
- Day 2 (Oct 29): web scan + voice + quote screen.
  Done: phone scan -> quote in < 15 s.
- Day 3 (Oct 30): match/book/escrow + glasses photo capture.
  Done: glasses photo -> booked pro -> payment `held`.
- Day 4 (Oct 31): pro job mode + realtime job log.
  Done: 4-step job completed hands-free, customer watches live.
- Day 5 (Nov 1): verification, payment release, SAM highlight, Muse Image preview.
  Done: full loop runs twice with no manual DB edits.
- Day 6 (Nov 2): harden, i18n, security review against section 7. Feature freeze 8 PM.
- Day 7 (Nov 3): demo recording support + README.
- Day 8 (Nov 4): fixes only until 10 AM; submit by noon.

## 9b. Phase 2 (Oct 29 - Nov 4): MVP is done; this section now takes priority over section 9
The detailed, ordered plan is `PHASE2_PROMPT.md` (blocks P0-1 ... P0-6, then P1). Follow it.
Summary below.
Tracks, in priority order:
1. Frontend: design system (one font pair, 5-colour palette, spacing scale, themed shadcn/ui),
   landing page, scan screen as the hero (live camera, streaming progress, SAM highlight),
   quote/booking cards, job log as a live timeline. Every state, 375 px, EN/ES.
2. Android app on Google Play: wrap the PWA as a Trusted Web Activity with Bubblewrap
   (`apps/android-twa`). Valid web manifest, maskable icons, service worker, offline page,
   `/.well-known/assetlinks.json`, a `/privacy` page covering camera, microphone, location,
   photos and payments. Target the API level Play Console currently requires.
   The store build must NOT include the Wearables SDK (public publishing of toolkit apps is
   not available in the developer preview). Glasses features stay in `apps/glasses`,
   distributed to testers through Meta's Wearables Developer Center release channel.
3. Demo support: `/admin` reset, a scripted demo account, stable fixture data.
4. Docs: README per section 8, `docs/architecture.md`, `docs/meta-tech.md` listing every
   Meta tool used and where.
Deadlines: Play closed-testing submission Oct 31; feature freeze Nov 2, 8 PM; submit Nov 4, noon.

## 10. Rules for the agent
- Ask before adding any new service or paid API, or before changing the stack.
- If a Meta API or the glasses SDK blocks progress for more than 45 minutes, switch to the
  fallback (phone camera, `damage_box`, skip preview) and log it in `CUT.md`.
- Record decisions in `DECISIONS.md` and cut features in `CUT.md`.
- Before starting a task, state which day and item it belongs to.
