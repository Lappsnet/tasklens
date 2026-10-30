# TaskLens — rolling progress log

Read this first in any fresh session, then `agent.md`, `DECISIONS.md`, `CUT.md`.
Update it at the end of every work item (done-check, commit hash, next scope).

## Where we are (2026-10-29)
- Branch `master` → `origin/master` (https://github.com/Lappsnet/tasklens, private).
- S5+S6 code DONE (funding links, fair-fix mediator), tests 80/80 green, `next build` green.
- P0-5 code DONE (PWA installable, TWA wrapper, assetlinks, full privacy/terms,
  store assets), tests 88/88 green, `next build` green.
- P0-6 code DONE (real Android Studio project, Mock Device Kit with bundled
  sample photo, user-token auth, TTS + deep link flow). `./gradlew assembleDebug`
  NOT run — no JDK/Android SDK in this env (owner step, documented).
- S7 code DONE (City board for all of LatAm, city-fenced, operator dashboard),
  tests 96/96 green, `next build` green.
- S8 code DONE (Pro Copilot: spec-grounded Q&A with spoken answers, advisory hazard
  watch with 60 s toggle, "listo" frame evidence per step), ai 37/37, web 71/75
  (+4 onboarding), typecheck + `next build` green.
- P1 code DONE: pro onboarding (`/pro/apply` → `/admin/pros` approve/reject,
  migration 013, approve creates a searchable pro), job-page share
  (WhatsApp + Facebook intents, native sheet for Instagram, copy-link), docs
  (`architecture.md`, `meta-tech.md`, `security-review.md` vs AGENTS §7 —
  all PASS, 2 OPEN owner-keyed items). Business accounts deferred (CUT.md).
  ai 37/37, web 75/75, typecheck + `next build` green.
- Audit: postcss forced to 8.5.32 via pnpm override (all postcss highs fixed);
  1 residual zod advisory is non-actionable (see DECISIONS.md).
- NEXT (autonomous): keyed-verification runbook written (`docs/keyed-verification.md`).
- NEXT (owner-blocked): Supabase link + keys + Vercel deploy + keyed verification.
- NEXT (autonomous, after your call): transactional email provider decision.
- Visual Motion Pass DONE (CSS-first, zero deps): gradient paper + glow/shadow
  system, keyframe library (stagger, pop, beam, ripple, sheen, ticker, float,
  draw-check), upgraded Button/Card Badge Stepper Timeline CameraFrame, count-up
  PriceRange, event Toasts; scan viewfinder + shutter + beam, quote stagger +
  pop price card, landing hero mesh + floating card + marquee. Reduced-motion
  respected throughout. web 75/75, ai 37/37, build green.
- U1 Foundation DONE: tokens.css (light/dark) + Tailwind mapped to vars, self-hosted
  Cabinet/General/JetBrains, RAC primitives (Button+loading/Input/Textarea/Select/
  Combobox/DatePicker/Tabs/Menu/Dialog/Sheet/Tooltip/Toast/Badge/Avatar/Skeleton/
  EmptyState/ErrorState), Blueprint signatures (Grid/Viewfinder/Annotation/Dimension/
  Seal/Beam/Magnetic/Spotlight/CountUp/Marquee), /dev/kit (404 in prod), FlowNav
  Back/Continue across the loop. web 75/75, ai 37/37, typecheck + build green,
  audit unchanged. Screenshots 375/768/1440 light+dark PENDING (no browser here —
  owner step: real phone + desktop, commit to docs/screens/ui-v2/).
- U2 header/footer/nav DONE: motion 14.8.0 scroll-condensing SiteHeader (logo mark,
  mega-menu dialog with 11 features + demo tile, mobile full-screen sheet, signed-in
  bell + role user menu with sign-out), SiteFooter (4 cols, ES/EN, Meta line),
  route-aware SiteChrome (marketing only; app keeps interim container to U4),
  landing anchor ids, nav config tests. web 79/79, build green. Company role UI
  mapped, data model (015) lands with U4.
- U3 auth DONE: (auth) split-screen group, login/signup 3-step flow (role cards,
  phone magic-link + resend-30s, Meta glasses pairing with QR/code/live status),
  /auth/callback + SSR cookie sessions + middleware refresh (real login fixed),
  profile PATCH, 016 pairings migration, pairing/profile tests. web 83/83,
  build green (79 pages).
- U4 shell + roles DONE: 015 companies, AppShell (sidebar/topbar/palette/mobile),
  role menus (tested), /inicio /jobs /ajustes /empresa /empresa/equipo.
  web 87/87, build green (87 pages).
- U5 landing DONE: content/landing.{es,en}.ts (typed, 11 chapters, 8 FAQs),
  hero Lens + SplitText, scroll race, horizontal steps, feature theater, demo
  block, role tabs, alcaldías (017 + access API), trust, Meta cards, FAQ.
  web 90/90, build green (88 pages). GSAP 3.15/SplitText/Lenis pinned.
- U6 deep pages DONE: /funciones/[slug] ×11 (hero, problem→solution, steps,
  Meta tech, FAQs, CTA), FeatureVisual placeholders, menu+theater linked.
  web 92/92 pending build.
- F0 DONE: 8-file U7 partial conversion was RED (`Button title` prop type error in
  jobs page, from the stashed diff) → stashed (2 entries: 8 files + 1 untracked
  test), continuing from f9af291. Clean tree: typecheck 3/3, ai 37/37, web 92/92,
  `next build` green. `apps/web/.next` deleted (was 1.1 GB). Commits: a41906e
  (gradle wrapper 9.7.1), 498b191 (AGENTS.md stack + FIX_PROMPT).
- F3 DONE: `pnpm e2e:screens` captures /, /login, /scan, /inicio, /pro, /empresa,
  /city × 375/768/1440 × light/dark into docs/screens/ui-v2/ (42/42 pass:
  no h-scroll, headings visible, zero console/page errors). Captures run
  against local dev (P0-1 boot guard refuses keyless `next start`; keyed prod
  run is owner-blocked). Bugs the run caught and fixed: missing SplitText
  import in HeroLens (hero animation was dead), /api/jobs 403 for AppShell
  roles (gated React Query to customer/pro/admin) + company dispatch pool
  added to GET /api/jobs (scoped to unassigned quoted/booked, id-lookup
  stays forbidden). Rare flake (2/~130 captures): transient hydration attr
  warning in dev streaming; never reproduced on retry.
- F2 DONE: F2.1 narrow middleware matcher + no session refresh on prefetches;
  F2.2 Turbopack dev (`serverExternalPackages` verified via /api/match); F2.3
  optimizePackageImports; F2.4 below-fold GSAP sections as dynamic chunks
  (RaceSection/Theater/HowSteps/TrustGrid), map already dynamic-only; F2.5 SSR
  session in group layouts + React Query job counts; F2.6 SW registers in
  production only, skips /_next//api/ (VERSION tasklens-v2); F2.7 single
  turbo typecheck task). Fixed en route: root layout {children} restore (F1.6
  had dropped it — pages rendered empty), dynamic() without ssr:false (illegal
  in RSC). Typecheck 4/4, ai 37/37, web 92/92, build green.
- F2 timings (Windows, no AV exclusions — owner action per F2.7):
  BEFORE (webpack): dev ready 6.4s; first / 73.6s; warm / 3.0s; first /scan 30.7s.
  AFTER (turbopack): dev ready 7–10s; first / 35–42s (Compiled / ~23s);
  warm / ~5s; first /scan ~8s; first /inicio ~3–8s.
  <10s ready: PASS. <4s cold first load: STILL OPEN — cold Turbopack compile of
  the landing bundle dominates on this box; remaining lever is the owner-side
  Defender exclusion + real hardware. F3 (next start) is unaffected by dev
  compile times.
- F1 DONE (F1.1 dark tokens only in tokens.css; F1.2 single SmoothScroll, no CSS
  smooth scroll; F1.3 Container sections, no .full-bleed, overflow-x clip; F1.4
  reveals with clearProps+once, headings only for pinned sections; F1.5 server
  landing, language from cookie; F1.6 route-group layouts, SiteChrome deleted;
  F1.7 deferred to F4 per prompt; F1.8 all screens on RAC primitives, legacy
  block deleted, btn-* effects renamed fx-*). Restored+fixed the stashed U7 WIP
  (fixed Button title/role/href + Input onChange type errors; byte-identical
  restore, LF endings). Typecheck 3/3, web 92/92, build green.

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
