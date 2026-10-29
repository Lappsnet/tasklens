# TaskLens — rolling progress log

Read this first in any fresh session, then `agent.md`, `DECISIONS.md`, `CUT.md`.
Update it at the end of every work item (done-check, commit hash, next scope).

## Where we are (2026-10-29)
- Branch `master` → `origin/master` (https://github.com/Lappsnet/tasklens, private).
- Last commit: `515a6e6` (Day 7). Tests 44/44 green, `next build` green.
- Days 1–8 DONE. Submit by noon Nov 4. Only human steps remain (below).

## Done
- Day 1: monorepo, schema+RLS+seed (25 pros), `scanToSpec` CLI (+ `--mock`).
- Day 2: `/scan` (camera+voice) → `/quote/[scanId]` in ~0.9s mock; `/api/scan`, `/api/transcribe`.
- Day 3: `matchAndBook` agent loop, `/api/match`, `/api/book` (triple-gated, server-side amount),
  Stripe TEST manual-capture hold (+ webhook), `/book/[scanId]`, `/api/glasses/upload`.
- Tests: `packages/ai/test/*` (16), `apps/web/test/*` (20). `turbo run test typecheck` green.
- Day 4: `/pro`, `/pro/jobs/[jobId]` (hands-free: big step buttons, spec checklist, voice
  notes, before photos), `/jobs/[jobId]` (customer live view). Chain booked→pending_verify
  verified live in ~0.5s; illegal jumps 409. Realtime with polling fallback (no Supabase env).
- Day 5: `/api/jobs/verify` (pass→completed+capture, review→resubmit), `/api/jobs/preview`
  (mock null), SAM best-effort. Full loop ×2 with no manual DB edits (~2.6 s/loop).

## Landmines (don't re-learn these)
- `@tasklens/ai` must stay a serverExternal (NOT bundled): it reads `prompts/*.md` via fs.
  Prompts load lazily. `.vscode/settings.json` pins workspace TS (kills phantom TS2591s).
- No `.env` in this env → everything runs mock-first (DEMO mock spec, mock pros, mock Stripe).
  Real paths engage automatically when keys exist. Never commit secrets.
- Memory stores (scans/jobs/payments) are per-process; Supabase persistence when configured.
- No Android SDK here → Kotlin files are written, not compiled.
- Next.js pinned 15.5.28 (CVE fix). 5 residual audit findings are non-actionable (see DECISIONS.md).
- Auth/RLS still missing (Day 6): every API trusts anonymous demo callers. MUST fix before production.

## Next (human steps — no agent action left)
- Record `apps/web/public/demo.gif` via DEMO.md; flip repo public; link Supabase/Stripe/
  Muse keys and run keyed verification; submit by noon Nov 4.
