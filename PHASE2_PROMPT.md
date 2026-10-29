# TaskLens — Phase 2 master prompt (Oct 29 – Nov 4, 2026)

Paste this whole file into your coding agent (Cline / OpenCode) from the repo root.
Then work one block at a time: "Do block P0-1. Show me the done-check when finished."

---

## ROLE
You are the lead engineer and product designer on TaskLens. Read `AGENTS.md`, `PROGRESS.md`,
`DECISIONS.md` and `CUT.md` first. `AGENTS.md` section 7 (security) is non-negotiable.
The MVP loop exists but has only ever run in MOCK mode. Phase 2 turns it into a real,
deployed, good-looking product that anyone can pay with, plus an Android app and a landing page.

Before each block: state the block ID. After each block: run tests + typecheck + build +
`pnpm audit`, commit (Conventional Commits), update `PROGRESS.md`, report what works, what
was cut, and timings. Never leave `master` broken.

## FINDINGS FROM THE CODE REVIEW (fix these; they are the "big improvements")
1. **Everything is mock-only.** No Supabase, Meta key or payment key has ever been used.
   Scans, jobs and payments live in per-process memory maps (`lib/scans.ts`, `lib/jobs.ts`),
   which break on Vercel serverless (each request can hit a different instance).
2. **Payments can't actually be collected.** `holdPayment()` creates a Stripe PaymentIntent
   with `confirm: false` and no client-side card collection (no Stripe.js / Elements), so
   capture would fail. Stripe also doesn't support merchants registered in El Salvador.
3. **The frontend is unstyled.** Tailwind and shadcn/ui are listed in AGENTS.md but not
   installed; `layout.tsx` uses Tailwind classes that do nothing. The home page is 30 lines.
4. **The glasses app is a stub.** `apps/glasses-android` is 3 uncompiled files; MockDeviceKit
   returns empty byte arrays. There is no Android project that builds.
5. **Rating step missing** from the core loop. **Map missing** (Mapbox in the stack, unused).
6. **CSP blocks real services.** `connect-src 'self'` will block Supabase (REST + Realtime
   websockets), PayPal and Mapbox once keys are added.
7. **In-memory rate limiter** doesn't work across serverless instances.
8. **Demo cookie trusts any role** (`customer|pro|admin`). Fine locally, dangerous if a
   production deploy runs with Supabase unset. Production must refuse demo mode.
9. **PWA manifest has no icons**, so install / Trusted Web Activity packaging fails.
10. **Seed data is Miami-only, English-first.** Target market is El Salvador / Central America.
11. **Unverified Meta endpoints.** Code uses `POST /v1/asr/transcribe`, `/v1/images/edits`
    and `sam-3.1` over `/v1/responses`. None has been called with a real key. Verify each
    against https://dev.meta.ai/docs with a real call; keep the realtime ASR websocket
    (`wss://api.meta.ai/v1/asr/realtime`) as the fallback if the file endpoint fails.
12. Duplicate instruction files: delete `agent.md`; `AGENTS.md` is the single source.

---

## P0 BLOCKS (must ship; in this order)

### P0-1 Go real: persistence + keys (Oct 29)
- Link Supabase. Apply `001`, `002`, `003` migrations. Generate types into `packages/db`.
- Replace memory stores with Supabase in every code path when `NODE_ENV=production`.
  Keep memory stores ONLY for `pnpm test` and local `DEMO_MODE=true`.
- Production guard: if `NODE_ENV=production` and Supabase or `MODEL_API_KEY` is missing,
  fail at boot with a clear error. Demo cookie login is impossible in production.
- Demo accounts in production = real Supabase users (customer, pro, admin) created by a
  seed script; the `/login` page offers "Try as customer / Try as pro" buttons that sign in
  to those accounts server-side (rate-limited). Admin is never one click.
- Rate limiting: Postgres-backed (a `rate_limits` table + RPC) so it works across
  instances. Ask before adding Upstash or any other service.
- CSP: allow exactly the origins needed — Supabase URL (https + wss), PayPal
  (`*.paypal.com`, `*.paypalobjects.com`), Mapbox (`api.mapbox.com`, `events.mapbox.com`),
  Meta API is server-side only (not in CSP). Remove `'unsafe-eval'` in production.
- Real Meta calls: run `scanToSpec`, `transcribe`, `previewAfter`, `segmentDamage` with the
  real key against 10 fixture photos. Record latency and pass rate in `PROGRESS.md`.
  Fix any endpoint/shape that the docs or responses contradict; log in `DECISIONS.md`.
- Deploy to Vercel with all env vars. **Done:** full core loop twice on the deployed URL,
  from two different phones, with zero manual DB edits.

### P0-2 Payments anyone can use: PayPal escrow (Oct 29–30)
Decision (owner-approved): primary provider = **PayPal Orders API v2 with
`intent: "AUTHORIZE"`**; works for buyers in El Salvador, Guatemala, the US and most
countries, with PayPal balance or debit/credit card. Keep Stripe as a secondary adapter
for US merchants only, behind the same interface.
- `apps/web/lib/payments/` with a provider interface:
  `createHold(jobId)`, `approve(orderId)`, `capture(jobId)`, `void(jobId)`, `refund(jobId)`.
  Implementations: `paypal.ts` (primary), `stripe.ts` (secondary), `mock.ts` (tests only).
- Flow: booking -> server creates PayPal order (amount computed server-side from the job,
  never from the client) -> client shows PayPal JS SDK buttons (PayPal + card) ->
  buyer approves -> server authorizes -> job `booked`, payment `held`.
  Verification `pass` -> server captures `POST /v2/payments/authorizations/{id}/capture`
  -> payment `released`. `review` -> stays held. Dispute/cancel -> void.
- Authorizations are honored for 3 days (reauthorize days 4–29). Jobs scheduled > 3 days
  out: authorize at booking, reauthorize 24 h before the slot.
- Webhooks: verify PayPal webhook signatures server-side (`/api/paypal/webhook`).
  Idempotency keys (`PayPal-Request-Id`) on every create/capture.
- Pro payouts: record a `payouts` ledger row per captured job (amount minus platform fee,
  default 10%, configurable). Actual PayPal Payouts API is behind a flag (needs PayPal
  approval); show the pro their pending/paid balance in `/pro`.
- Currency: USD (El Salvador uses USD). Show "Prueba / Sandbox" badge while in sandbox.
- Env: `PAYPAL_CLIENT_ID` (public), `PAYPAL_CLIENT_SECRET` (server-only),
  `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=sandbox|live`, `PLATFORM_FEE_PCT`.
- Tests: hold -> capture, hold -> void, capture refused unless verdict `pass`,
  amount tampering rejected, webhook bad signature rejected.
- **Done:** a sandbox buyer pays by card on the deployed site, job verifies, capture
  succeeds, pro sees the payout row. Going live = owner verifies a PayPal Business account
  and flips `PAYPAL_ENV=live`; no code change.

### P0-3 Design system + frontend rebuild (Oct 30–31)
- Install Tailwind CSS + shadcn/ui (pin versions). Delete the hand-written CSS classes as
  each screen is converted.
- Tokens (CSS variables, light + dark):
  - Ink `#0F1B2D` (text, primary buttons) · Paper `#FAF7F2` (background)
  - Accent "safety orange" `#F26A1B` (CTAs, highlights, damage overlay)
  - Trust green `#0E9F6E` (verified, released, success) · Slate `#64748B` (secondary text)
  - Radius 12 px cards / 10 px buttons; spacing scale 4/8/12/16/24/32/48/64.
- Type: `Bricolage Grotesque` (display, 600–800) + `Inter` (body), via `next/font`.
- Components: Button, Card, Badge (status), Stepper (job status), PriceRange, ProCard
  (photo, rating stars, jobs done, distance, rate, verified badge), Timeline (job log),
  CameraFrame, BottomSheet (mobile), Toast, Skeleton, EmptyState, ErrorState.
- Screens (mobile-first, 375 px, then desktop):
  - `/scan`: full-bleed camera, big shutter, hold-to-talk mic with live waveform, streaming
    progress "Looking… Estimating… Finding pros…".
  - `/quote`: photo with SAM mask (fallback damage box) fading in, price range as hero
    number, steps, materials, safety flags as orange callouts, "after" preview toggle.
  - `/book`: Mapbox map + 3 ProCards + slot chips + PayPal buttons in a bottom sheet.
  - `/jobs/[id]`: status stepper + live timeline (photos, voice notes, steps, verification
    checks turning green, payment released).
  - `/pro`: earnings card (pending / paid), job inbox, availability toggle.
  - `/pro/jobs/[id]`: huge buttons, current step read aloud (Web Speech API), voice notes.
- Add the **rating step** after `completed` (1–5 stars + optional comment; updates
  `pros.rating` server-side as a running average).
- Spanish is the default language when `Accept-Language` starts with `es`; EN/ES toggle
  everywhere; all new strings in `lib/i18n.ts`.
- Reseed for El Salvador: 25 pros in San Salvador, Santa Tecla, Antiguo Cuscatlán,
  Soyapango, San Miguel, Santa Ana (realistic Salvadoran names, USD rates, coordinates).
  Keep 5 Miami pros for a US demo.
- **Done:** Lighthouse mobile >= 90 performance/accessibility on `/` and `/scan`; every
  screen has loading, empty and error states; screenshots at 375 px in `docs/screens/`.

### P0-4 Landing page `/` (Oct 31)
Goal: in 10 seconds a judge understands the broken status quo and why TaskLens fixes it.
Do NOT invent statistics. Where a number would help, leave a clearly marked
`{{SOURCE_NEEDED}}` placeholder for the owner to fill with a sourced figure.
Don't name or criticise a specific real institution or company; describe the pattern.
Use text (not logos) for Meta product names.

Sections and copy (ES is primary; EN in parentheses):
1. **Hero** — "Tu reparación, cotizada en segundos. No en semanas."
   ("Your repair, quoted in seconds. Not in weeks.")
   Sub: "Mira el problema con tus lentes Meta o tu celular, descríbelo en voz alta y
   TaskLens te conecta con un profesional verificado. Tu pago queda protegido hasta que el
   trabajo esté verificado."
   CTAs: "Escanear un problema" (primary, orange) · "Soy profesional" (secondary).
   Visual: phone mockup showing the quote screen + a looping 8 s glasses POV clip
   (`/public/hero.mp4`, muted, poster image, respects `prefers-reduced-motion`).
2. **El problema hoy (The problem today)** — three cards:
   - *Esperar* — "Las solicitudes pasan por una oficina central o una sola empresa, y la
     visita tarda días o semanas." (Requests go through one central office or company;
     the visit takes days or weeks.)
   - *Adivinar* — "No sabes cuánto costará hasta que alguien venga a ver." (You don't know
     the price until someone comes to look.)
   - *Arriesgar* — "Encontrar mano de obra calificada y confiable depende de recomendaciones,
     y pagas por adelantado sin garantía." (Finding skilled, trusted labor depends on word of
     mouth, and you pay upfront with no guarantee.)
3. **Hoy vs. con TaskLens** — a two-row timeline graphic, labelled "ilustrativo":
   Today: report -> wait for a visit -> wait for a quote -> wait for the repair.
   TaskLens: scan (1 min) -> quote (seconds) -> booked today -> pay only when verified.
4. **Cómo funciona (How it works)** — 4 steps with icons: Mira · Habla · Reserva · Verifica.
5. **Para profesionales (For pros)** — jobs without middlemen, a clear spec and photos
   before you arrive, payment guaranteed by escrow, ratings that build your reputation.
   CTA "Únete como profesional" -> pro sign-up (name, trade, zone, phone, ID photo for
   manual verification; status `pending_verification`).
6. **Confianza y seguridad** — escrow hold, AI verification of before/after photos,
   verified pros, automatic safety flags (gas, electricity, structural) that route to
   licensed pros.
7. **Categorías** — plumbing, electrical, appliances, drywall & paint, construction &
   masonry, assembly, cleaning, installations & appointments.
8. **Hecho con IA de Meta (Built with Meta AI)** — Muse Spark, Muse Voice Transcribe,
   Muse Image, SAM 3.1, Ray-Ban Meta glasses: one line each on what it does in TaskLens.
9. **Preguntas frecuentes** — price accuracy, what if the work is bad, how pros are
   verified, payment methods (PayPal, debit/credit card), countries served.
10. **Final CTA + footer** — scan CTA, pro CTA, `/privacy`, `/terms`, EN/ES toggle.
Design: Paper background, Ink text, one orange CTA per viewport, generous whitespace,
Bricolage headlines 48–64 px desktop / 36 px mobile, real product screenshots (no stock
photos of people), subtle scroll-in animations only. SEO: metadata, Open Graph image
1200x630 (make it with Muse Image + real wordmark), `hreflang` es/en, sitemap.
**Done:** looks right at 375 / 768 / 1440 px; Lighthouse >= 90 all four; no
`{{SOURCE_NEEDED}}` left that the owner hasn't approved.

### P0-5 Android app for Google Play (Oct 30–31)
- Make the web app a complete PWA: icons 192/512 + maskable, `theme_color #0F1B2D`,
  service worker with offline page, installable.
- `apps/android-twa`: Trusted Web Activity via Bubblewrap pointing at the production URL.
  Package `com.tasklens.app`. Serve `/.well-known/assetlinks.json` with the Play app-signing
  SHA-256. Target the API level Play Console currently requires.
- `/privacy` and `/terms` pages (ES + EN) covering camera, microphone, location, photos,
  payments (PayPal), data retention, deletion requests.
- Store assets in `docs/store/`: 512 icon, 1024x500 feature graphic, 8 screenshots at
  1080x1920 (from the real app), short + full descriptions ES/EN.
- The store build must NOT include the Wearables SDK.
- **Done:** signed AAB builds; installs on a real phone; opens with no browser bar;
  uploaded to internal testing; closed testing submitted by **Oct 31**.

### P0-6 Glasses: real or honest (Oct 31 – Nov 1)
- Turn `apps/glasses-android` into a real Android Studio project (Kotlin + Compose) that
  compiles: `./gradlew assembleDebug` must pass.
- Integrate the Meta Wearables Device Access Toolkit per its official docs: pairing via
  the Meta AI app, photo capture, mic via Bluetooth audio, TTS via phone speaker route.
- Flow: "Fix this" button -> capture -> `POST /api/glasses/upload` (authenticated with the
  user's Supabase token, never a shared secret) -> speak the summary -> open the quote.
- If toolkit access or pairing blocks > 45 min: ship the same app on the Mock Device Kit
  (with a real bundled sample photo, not empty bytes) and say so in `CUT.md` and README.
  Never claim real glasses integration in the README or video unless it ran on real glasses.
- Distribution: Meta Wearables Developer Center release channel for testers.

---

## P1 BLOCKS (Nov 1 – Nov 2, before the 8 PM freeze)
- Pro onboarding + admin verification queue (`/admin/pros`): approve / reject with reason.
- Business accounts: a company can list several pros (team) and receive jobs as a team.
- Notifications: email (Supabase Auth SMTP) on booking, en route, completed. WhatsApp
  share link for the job page (no WhatsApp API).
- Muse Image "after" preview live on the quote page (flagged; hide if quality is poor).
- `docs/architecture.md`, `docs/meta-tech.md` (every Meta tool, where it's used, real
  latency), updated README with real screenshots and the deployed URL.
- Security review against AGENTS.md section 7 with a written checklist in
  `docs/security-review.md`; fix every high item.

## OUT OF SCOPE (log ideas in CUT.md)
Live video consult, multi-currency, dispute arbitration UI, real background checks,
iOS app, native HUD rendering on Ray-Ban Display.

## RULES
- Ask before adding any service or paid API not named here.
- No invented numbers in UI copy, README or video script.
- Secrets never in client code, logs or commits.
- Feature freeze Mon Nov 2, 8:00 PM UTC-6. Submit Wed Nov 4 by 12:00 PM UTC-6.
