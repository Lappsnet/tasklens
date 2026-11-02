# TaskLens — Visual overhaul prompt (V0–V9), every page

Paste into your coding agent from the repo root. Work one block at a time:
"Read AGENTS.md and VISUAL_OVERHAUL_PROMPT.md. Do block V0."
This replaces the visual parts of `UI_UX_PROMPT.md` where they conflict. Security rules in
`AGENTS.md` section 7 still apply. Feature freeze rules from `AGENTS.md` still apply: this is
polish of existing pages, not new features.

---

## WHAT IS WRONG TODAY (from the owner's screenshots of `/`, Nov 1, and the code)

Bugs (fix first, V0):
1. **Content touches the screen edges.** Sections have no inner container (`app/(marketing)/page.tsx`
   wraps sections in `py-10` only; no `Container` anywhere in `components/landing/`). The header is
   centred at ~1000 px while "The problem today", cards and FAQ run from x = 0 to the scrollbar.
2. **FAQ answers never open.** `FaqList.tsx` puts `data-[expanded]:grid-rows-[1fr]` on
   `DisclosurePanel`, but React Aria sets `data-expanded` on the parent `Disclosure`, so the panel
   stays at `grid-rows-[0fr]` forever. The answers exist in `content/landing.*.ts`; they are just
   never shown.
3. **Municipality form is unusable.** On the dark section the `Field` label is `text-ink` (dark on
   dark, invisible) and the inputs render solid white because `cn()` just joins strings: the
   default `bg-surface` and the override `bg-white/5` conflict and the wrong one wins. Typed text
   is white on white.
4. **English mode still shows Spanish:** marquee trades, "Hoy", "día 14", "minutos, no semanas",
   "VERIFICADO", "Probar ahora", chapter eyebrows "01 · ESCANEO", "PAGO". Hardcoded strings in
   `RaceSection.tsx`, `HowSteps.tsx`, `HeroLens.tsx`, `Theater.tsx`, `TrustGrid.tsx`.
5. **Grids leave holes:** "How it works" uses 4 columns of a 5-column track (empty right third);
   "Built with Meta AI" is 3 + 2 with an empty cell; the marquee clips "FONTANERÍA" mid-word.
6. **Placeholders shipped as content:** Muse Image card is an empty grey box; SAM card is a red
   rectangle on a dark bar; glasses card is an orange line; the hero "AI view" is a nearly empty
   dark panel with a tiny SVG pipe; the phone in the feature theater shows an empty frame.
7. **Theater chapters are unreadable:** inactive chapters fade to ~25 % opacity, so most of the
   section looks disabled; the phone sits 400 px away from the text.

Design problems (V1–V9):
- Type is too small and flat: body ~13 px, section titles ~24 px on a 1920 px screen, no lead
  paragraphs, muted grey-blue text everywhere, little contrast between levels.
- Every section is the same thing: thin-bordered white cards on cream, left-aligned, same
  padding. No rhythm, no focal point, no photography, no data.
- Animations decorate instead of explaining (scan beam, dots, sheen) while the real story
  (photo → AI finding → price → contract → verified) is never shown with real visuals.
- No charts or tables anywhere a user would expect numbers (earnings, SLAs, job status, prices).

---

## V0. Bug fixes (half a day, do before any redesign)
1. `components/ui/Container.tsx`: `mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12`, plus
   `Section` (`<section>` with vertical rhythm, optional `tone="light" | "dark" | "paper"`) that
   always renders a Container inside. Every landing section, the header and the footer use it.
2. Add `tailwind-merge` (approved) and make `cn()` call `twMerge(clsx(...))` so overrides win.
3. FAQ: move the expand styling to the parent (`group` on `Disclosure`,
   `group-data-[expanded]:grid-rows-[1fr]` on the panel). Test: clicking a question shows its
   answer; keyboard Enter/Space toggles it.
4. `Field` gets a `tone="dark"` variant (label `text-white/80`, input `bg-white/5 border-white/15
   text-white placeholder:text-white/40`). Every input has a visible label and a placeholder example.
5. Move every hardcoded string into `content/landing.{es,en}.ts` / `lib/i18n.ts`. Add a test that
   renders `/` with `lang=en` and fails if any of these Spanish words appear: Hoy, día, minutos,
   semanas, VERIFICADO, Probar, ESCANEO, PAGO, CONTRATOS, CALENDARIO.
6. Marquee: real infinite loop (duplicate track, `translateX(-50%)` keyframes), masked edges
   (`mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)`), no clipping.
7. Remove the placeholder visuals (empty Muse Image box, red bar, orange line, empty phone
   frame). Until V2/V3 replace them, show nothing rather than a placeholder.
Done: screenshots at 1440 and 375 show content aligned with the header, the FAQ opens, the form
is readable, and English mode has no Spanish.

---

## V1. Design system v2: type, colour, layout, motion (1 day)

### Typography (fluid, readable at 375 and 1920)
Use `clamp()` tokens in `tokens.css` and Tailwind `fontSize`:
| Token | Size (min → max) | Line height | Font / weight | Use |
| --- | --- | --- | --- | --- |
| display | 44 → 96 px | 0.95 | Cabinet Grotesk 800, tracking -0.03em | hero headline only |
| h1 | 36 → 64 px | 1.0 | Cabinet 800, -0.025em | page titles, section headlines |
| h2 | 28 → 44 px | 1.05 | Cabinet 700, -0.02em | section titles |
| h3 | 20 → 26 px | 1.2 | Cabinet 700 | card titles |
| lead | 18 → 22 px | 1.5 | General Sans 400 | the paragraph under every section title |
| body | 16 → 18 px | 1.6 | General Sans 400 | default text (never below 15 px) |
| small | 14 px | 1.5 | General Sans 500 | meta, captions |
| eyebrow | 12 → 13 px | 1.2 | JetBrains Mono 600, uppercase, +0.12em | section labels |
| number | 40 → 72 px | 1.0 | Cabinet 800, `tabular-nums` | prices, KPIs, counters |
Rules: max 65 characters per line for body; every section = eyebrow + headline + lead;
muted text must meet 4.5:1 contrast on its background (darken `--muted` on paper to `#4A5869`).

### Colour usage
- Alternate section bands: paper (`--bg`) → white surface → **ink night** (`#0A1220`, blueprint
  grid) → paper. At most 2 dark bands on the landing.
- Signal orange only for the primary action and the AI finding in a visual; never for decoration.
- Add `--signal-soft` (orange 10 %), `--verified-soft`, `--blueprint-soft` for status chips and
  chart fills.

### Layout
- 12-column grid inside the Container (gap 24 px desktop, 16 px mobile).
- Section padding: 96–160 px desktop, 64–80 px mobile. Space between headline block and content: 48 px.
- Vary compositions; never two consecutive sections built only of equal cards. Patterns to use:
  split (text 5 cols / visual 7 cols), bento grid (mixed tile sizes), full-bleed photo band,
  stat band, horizontal timeline, before/after slider, sticky storytelling.
- Cards: 20 px radius, 1 px `--line` border, NO shadow at rest; hover lifts 2 px with soft shadow.
  Maximum 3 card styles across the product: plain, media (photo on top), dark.

### Motion (purposeful only)
Every animation must explain the product. Keep: The Lens, AI annotations drawing onto a photo,
counters on real numbers, before/after reveal, timeline progress, verified stamp. Remove: scan
beam on static images, random pulsing dots, button sheen, card tilt everywhere.
Timings: enter 400–600 ms `--ease-out`, stagger 60 ms, hover 150 ms. Reduced motion: no motion.

### Charts and tables (new)
- Charts: build with `d3-scale`, `d3-shape`, `d3-array` (approved; math only) rendering our own SVG
  in `components/charts/`: `AreaTrend`, `BarCompare`, `Donut`, `Sparkline`, `ProgressRing`,
  `GanttStrip`, `SlaBar`. Style: no chart junk, light gridlines (`--line`), direct labels instead
  of legends, tabular numbers, hover tooltip with the exact value, animate the line/bars drawing
  in once on view. Every chart has a text summary for screen readers.
- Tables: `@tanstack/react-table` (approved; headless) in `components/data/DataTable.tsx`: sticky
  header, zebra-free rows with 1 px separators, right-aligned numbers in mono, status chips,
  sortable columns, row hover, empty and loading states, and on mobile each row becomes a card.
- Only show real or seeded-demo numbers, labelled as such. Never invent statistics.

Deliverable: update `/dev/kit` with every token, type level, card, chart and table, light + dark.

---

## V2. Real photography pipeline (owner's images)
The owner's images go in `apps/web/public/images/jobs/` (currently EMPTY; owner copies them in).
1. `scripts/optimize-images.ts` with `sharp` (approved, dev dependency): strip EXIF/GPS, output
   AVIF + WebP at 640 / 1280 / 1920 px, generate a tiny blurred placeholder (`blurDataURL`).
2. Before using any photo, list them all and ask the owner, per photo: what job it shows, status
   (reported / in progress / done), municipality, before/after pairing, and source (own photo,
   taken with permission, or licensed with the licence name). Do not use a photo until answered.
   Blur faces, licence plates and house numbers.
3. Store answers in `content/showcase.ts` (type from `FIX_PROMPT.md` F4) with `credit`/`licence`.
4. Use photos in: hero (The Lens), "Trabajos en vivo" showcase, feature pages, quote/job demo
   states, empty states, auth side panel, Alcaldías section, OG image.
5. Honesty rule: any job shown on public pages that did not happen through TaskLens is labelled
   **"Ejemplos de demostración / Demo examples"**. Photos of real completed work can be shown as
   "Proyectos reales" only if the owner confirms the work was real and permission was given.

---

## V3. Landing page, section by section (1.5 days)
Order and design for `/`:

1. **Hero** (ink night band, full viewport height minus header).
   Left 5 cols: eyebrow, display headline (2 lines max), lead, CTAs (primary orange + ghost
   "Watch demo · 2 min" with a play icon), and a trust row: "Pago protegido · Profesionales
   verificados · Contrato firmado" with icons.
   Right 7 cols: **The Lens on a real photo** (best "reported" image). Inside the lens: SAM-style
   orange mask, 3 annotation callouts drawn with leader lines (finding, time, price range), all
   from `content/showcase.ts`. Under the photo, a floating "quote card" (glass, 360 px) that
   counts up the price range and shows "Muse Spark · 4.2 s" style meta ONLY if measured.
   Marquee of trades at the bottom edge (fixed, masked, translated).
2. **Trabajos en vivo** (paper band). Tabs Reportados / En progreso / Terminados with counts;
   bento grid of photo cards (see `FIX_PROMPT.md` F4); one large featured card with the
   before/after slider. Label "Ejemplos de demostración".
3. **El problema hoy** (white band). Split layout: left = headline + lead; right = three rows (not
   cards) each with a big mono number index, a title and 2 lines, and a thin illustration drawn
   in on scroll. Text 18 px, not 13.
4. **La carrera** (ink night band). A real horizontal timeline chart: x-axis "time" with labels
   Day 1 … Day 14 for "Today" and Minute 1 … Hour 1 for TaskLens, both on one visual scale switch
   ("Hoy: semanas" vs "TaskLens: minutos"), milestones as dots with labels, the TaskLens line
   finishes with the verified stamp. Label "Ilustrativo". Fully translated.
5. **Cómo funciona** (paper). 4 steps in a horizontal stepper with a connecting line that fills
   as you scroll; each step has a real photo or app screenshot, not just an icon. Equal columns,
   no empty space.
6. **Feature theater** (white). Phone mockup sticky right at 5 cols, chapters 7 cols left.
   Inactive chapters at 55 % opacity minimum (never 25 %); active chapter has an orange left rule.
   The phone shows REAL screenshots captured from the app (Playwright, see V9) for each chapter:
   quote, contract, calendar, PayPal hold, verification, passport, project plan, funding link,
   mediation, glasses copilot. Smooth cross-fade between them.
7. **Demo video** (ink night). 16:9 player at 10 cols centred, poster from a real frame, chapter
   chips under it. If no video yet: poster + "Demo disponible el 3 de noviembre" (owner sets date).
8. **Para cada lado** (paper). Tabs Clientes / Profesionales / Empresas / Alcaldías; each tab =
   split layout with 4 benefits and a real screenshot of that role's dashboard.
9. **TaskLens para Alcaldías** (ink night). Left: flow triage → dispatch → proof with an
   `SlaBar` mini chart using seeded demo data (labelled). Right: the access form with V0 fixes.
   Replace the dot cluster with a proper outline map of El Salvador's 14 departments (public-domain
   or self-drawn SVG), demo report pins clustered by department.
10. **Confianza y seguridad** (white). 4 columns, each with an icon in a soft-tinted square, title,
    2 lines; below them one wide "how escrow works" diagram: Pago retenido → Trabajo → Verificación
    IA → Pago liberado.
11. **Hecho con IA de Meta** (paper). 5 tiles in a bento layout (2 large, 3 small), each with a
    REAL micro demo from the product: Muse Spark = a real `ai_spec` JSON rendered as a styled
    card; Voice Transcribe = waveform turning into the transcript text; Muse Image = the before
    photo and a generated after preview (only if generated with the real API; otherwise omit);
    SAM 3.1 = photo with the mask; Glasses = a POV still with the "Fix this" UI. No grey boxes.
12. **FAQ** (white). Two columns on desktop: left = headline + "¿Más preguntas?" contact; right =
    accordion. 10 questions with complete 2–4 sentence answers (price accuracy, bad work, pro
    vetting, payment methods, countries, glasses required?, data and privacy, cancellations,
    warranty, how municipalities join). Answers must match how the product actually works.
13. **Final CTA** (ink night): display headline, two CTAs, small trust row.
14. **Footer**: 4 columns, language, legal, "Hecho con IA de Meta".

---

## V4. Feature pages `/funciones/[slug]` (half day)
One template: hero (photo or screenshot, headline, lead, CTA) → "El problema" → "Cómo funciona"
(3 steps with screenshots) → "Qué ve la IA" (annotated photo) → Meta tech used → FAQ (3) →
related features → CTA. Same type scale and bands as the landing.

---

## V5. Auth pages: `/login`, `/signup`, `/connect-glasses` (half day)
- Split screen: left form column (480 px max), right photo panel (real job photo with The Lens
  annotation animation and a one-line quote of what TaskLens does).
- Step indicator at top ("1 Quién eres · 2 Cómo te conectas · 3 Perfil").
- Role cards: large (min 120 px tall), icon in tinted square, title + one line, selected state with
  orange border and check.
- Connect method cards: "Con mi celular" / "Con lentes Meta", each with an illustration.
- `/connect-glasses`: big pairing code in mono 48 px with copy button, QR code 200 px, live status
  stepper (Esperando → Teléfono conectado → Lentes listos) with animated transitions, help text.

---

## V6. App shell + role dashboards (1 day)
Shell: sidebar 264 px (collapsible to 72 px), grouped navigation with section labels, active item
with orange left bar and tinted background; top bar with page title (h1 36 px), breadcrumb, search
(Ctrl+K), notifications, user menu. Mobile: bottom tab bar 64 px with the raised center action.
Page header pattern on every app page: title + one-line description + primary action on the right.

Dashboards (use V1 charts and DataTable; seeded demo data labelled "Demo"):
- `/inicio` (Cliente): greeting + big "¿Qué hay que arreglar hoy?" scan card with a photo; active
  jobs as horizontal cards with status stepper; upcoming appointments list; pending signatures;
  Home Passport summary (warranties expiring, reminders); spend this year `AreaTrend`.
- `/pro` (Profesional): KPI row (earnings week with `Sparkline`, jobs done, rating, on-time rate);
  today's route map with ordered stops; new requests as cards with photo, price, distance and
  Accept/Decline; earnings by week `BarCompare`; trust score `ProgressRing` with breakdown.
- `/empresa` (Empresa): KPI row; dispatch board (columns: Sin asignar / Asignado / En progreso /
  Verificación) with drag-and-drop cards; team availability strip; jobs `DataTable`; revenue
  `AreaTrend`.
- `/empresa/equipo`: team `DataTable` (pro, trade, rating, jobs, status, availability) + invite.
- `/city` (Alcaldía): KPI row (open reports, overdue SLA, avg resolution time, resolved this
  month); map with clustered pins; triage `DataTable` sorted by severity with SLA countdown
  chips; `SlaBar` by category; contractor performance table.
- `/admin`, `/admin/pros`: verification queue table with document preview drawer; system health.

---

## V7. Core flow pages (1 day) — the demo path, make each one a "wow"
- `/scan`: full-height camera stage (dark), viewfinder, shutter 72 px, hold-to-talk with live
  waveform and live transcript text, "Usar foto de ejemplo" chips with real photos. Processing
  state: the photo stays visible and annotations appear one by one with step labels.
- `/quote/[scanId]`: two columns: left = the photo with mask + callouts (60 %); right = quote
  panel: price range in `number` type, confidence `ProgressRing`, diagnosis, steps as a numbered
  timeline, materials `DataTable` with quantities and est. cost, safety flags as warning callouts,
  "Ver resultado esperado" (Muse Image) toggle, sticky "Reservar profesional" button.
- `/book/[scanId]`: map (5 cols) + 3 pro cards (7 cols) with photo/avatar, rating, jobs, distance,
  trust ring, price; slot chips grouped by day; PayPal in a sheet; success screen with stamp.
- `/contracts/[jobId]`: document layout (paper, serif-free, 72-char measure) with sticky plain-
  language summary on the right; signature pad; signatures appear with stroke animation; hash in mono.
- `/jobs` and `/jobs/[jobId]`: list as DataTable/cards with status chips and photo thumbnails;
  detail = status stepper, live timeline with photos and voice notes, before/after slider at
  completion, payment card (held → released) and rating.
- `/pro/jobs/[jobId]`: high-contrast job mode: huge step text (32 px), Next/Back 64 px buttons,
  voice note button, copilot answer panel, evidence photo strip.
- `/pro/calendar`: week view with time grid, job blocks coloured by status, travel time blocks,
  day plan side panel with route.
- `/passport`: home overview card (photo, address hidden, members), timeline of passport entries
  with before/after thumbnails, warranties with countdown rings, reminders list.
- `/projects/new` and `/projects/[id]`: upload/record step, then phase `GanttStrip`, budget by
  phase `BarCompare`, render gallery, crew cards, milestone escrow table.
- `/fund/[token]`: focused payer page: job photo, contract summary, amount, PayPal, progress.
- `/pro/apply`, `/ajustes`: clean two-column forms with section headings and helper text.
- `/offline`, `/privacy`, `/terms`: readable document layout (h1/h2 scale, 68-char measure).

---

## V8. Empty, loading and error states (half day)
Every list and dashboard has: skeleton matching the final layout; empty state with a real photo or
blueprint illustration, one sentence and one action; error state with retry. No blank panels.

---

## V9. Visual QA loop (run after every block)
1. Extend the existing Playwright screenshot script to all pages listed above at 375 / 768 / 1440 /
   1920 px, light and dark, plus `lang=en` on the landing. Save to `docs/screens/ui-v3/`.
2. Open the screenshots and check each against this list before committing:
   - Content aligned to the same Container edges as the header.
   - Section titles ≥ 28 px mobile / ≥ 40 px desktop; body ≥ 16 px; no line longer than ~70 chars.
   - No empty grey boxes, empty frames or placeholder rectangles.
   - No grid holes (every row filled or intentionally centred).
   - Text readable on every background (light and dark bands, both themes).
   - English mode has no Spanish and vice versa.
   - One clear primary action per screen.
3. Capture app screenshots for the feature theater and role tabs from these runs
   (`public/images/screens/`).
4. Lighthouse ≥ 90 (performance, accessibility) on `/`, `/login`, `/scan`, `/inicio`.

## Rules
- One commit per block (`fix(ui): V0 …`, `style(ui): V1 …`, `feat(ui): V3 landing …`).
- Approved new dependencies: `tailwind-merge`, `clsx`, `d3-scale`, `d3-shape`, `d3-array`,
  `@tanstack/react-table`, `sharp` (dev). Ask before any other.
- No invented numbers, testimonials or partner logos. Demo data is labelled "Demo".
- Stop after V0 and after V3 and show the owner the 1440 px and 375 px screenshots.
