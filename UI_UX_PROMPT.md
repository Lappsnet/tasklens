# TaskLens — UI/UX overhaul prompt ("Blueprint" redesign)

Paste this file into your coding agent from the repo root. Work block by block:
"Do block U1. Show me screenshots at 375 px and 1440 px when finished."
Read `AGENTS.md` first. Security (section 7) still applies to every screen.
Owner decision (overrides AGENTS.md section 4 on UI): shadcn/ui, lucide icons and Inter are
dropped so TaskLens doesn't look like every other AI-built app.

---

## 0. WHY IT LOOKS BASIC TODAY (code review, Oct 29)
1. `app/layout.tsx` wraps EVERY page in `max-w-md px-4 ... sm:max-w-2xl`. The landing page,
   dashboards and city board are all squeezed into a 448–672 px column, even on desktop.
   This is the single biggest reason it doesn't look professional.
2. There is no header, no navigation and no footer shell. Login is only reachable by typing
   `/login`. Nothing tells a user where they are or what role they're in.
3. Two style systems fight: ~60 legacy CSS classes in `globals.css` (`.card`, `.btn`, `.seg`,
   `.pill`, `.chip` …) plus Tailwind. Spacing, radius and type differ screen to screen.
4. The landing page (`app/page.tsx`, 216 lines) is short paragraphs in a narrow column;
   features are one line each, there is no product imagery and no demo video slot.
5. `/login` hardcodes `lang = "en"`, shows raw demo-role buttons and has no notion of
   "phone vs Meta glasses" or of the four user types.
6. Copy lives inline in components; landing copy is separate from `lib/i18n.ts`.
7. There is no role for contractor companies; `city_operator` exists but the UI calls it
   nothing a Salvadoran user would recognise ("Alcaldía").

---

## 1. DESIGN DIRECTION: "BLUEPRINT"
TaskLens is about seeing a physical problem and getting it built right. The visual language
borrows from **technical drawings, site plans and camera viewfinders**, not from SaaS templates.

Signature motifs (use consistently, never as decoration alone):
- **Blueprint grid**: faint 8 px / 40 px grid on dark sections; dimension lines with ticks and
  measurements ("1.5 in", "$120–220") that draw themselves in.
- **Viewfinder brackets**: the four corner brackets frame anything the AI "sees" (photos,
  scan results, hero media, focused cards).
- **Annotation callouts**: thin leader lines from a point on an image to a monospace label,
  like an engineer's markup. This is how AI findings are shown everywhere.
- **Safety orange as signal**: orange marks exactly one thing per view: the action or the
  finding. Never used for decoration.
- **Verified green stamp**: completion, release of payment and signed contracts get a
  stamp-like seal animation.

### Tokens (CSS variables in `app/styles/tokens.css`, light + dark; Tailwind reads them)
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#F6F3EE` (drafting paper) | `#0A1220` (night blueprint) | page |
| `--surface` | `#FFFFFF` | `#111C2E` | cards, sheets |
| `--ink` | `#0F1B2D` | `#EAF0F7` | text |
| `--muted` | `#5B6B7F` | `#8FA3BA` | secondary text |
| `--line` | `#0F1B2D14` | `#7FA7D61F` | borders, grid |
| `--blueprint` | `#1F4E8C` | `#5B9BE6` | grid lines, diagrams, links |
| `--signal` | `#F26A1B` | `#FF7A2E` | primary action, AI findings |
| `--verified` | `#0E9F6E` | `#2BD39A` | verified, released, signed |
| `--warning` | `#C2410C` | `#FB923C` | safety flags |
Radius: 6 px inputs, 10 px buttons, 16 px cards, 28 px sheets. Spacing scale 4/8/12/16/24/32/48/64/96/128.
Shadows: one soft elevation + one "lifted" elevation; no glows except the scan beam.

### Type (self-hosted, NOT Google defaults, NOT Inter)
- Display: **Cabinet Grotesk** (Fontshare, 700/800) — headlines, numbers.
- Body: **General Sans** (Fontshare, 400/500/600) — UI and paragraphs.
- Mono: **JetBrains Mono** (OFL) — annotations, prices in diagrams, IDs, timers.
Load with `next/font/local` from `apps/web/public/fonts/` (woff2, `font-display: swap`,
preload only display 800 + body 400/600). Confirm each license allows commercial use and
note it in `DECISIONS.md`.
Scale: 14 / 16 / 18 / 22 / 28 / 36 / 48 / 64 / 88 px; headlines tight (-0.02em), body 1.55.

### Iconography and imagery
- Icons: **Phosphor Icons** (`@phosphor-icons/react`), duotone weight for features, regular in UI.
- Product imagery = real screenshots of TaskLens and real photos the owner takes (damaged
  wall, sink, electrical panel). No stock photos of smiling workers.
- Meta product names written as text; no Meta, Ray-Ban or partner logos; no 3D model that
  copies a branded glasses design.

---

## 2. LIBRARIES (pin exact versions at install; stay on React 18)
| Need | Library | Why this one |
| --- | --- | --- |
| Scroll-driven and hero effects | **GSAP** + ScrollTrigger + SplitText (`gsap`, free incl. plugins; confirm current license on gsap.com) | Pinned scenes, text reveals, SVG line drawing: the "super effects" |
| Smooth scroll (landing only) | **Lenis** (`lenis`) | Cinematic scroll; synced to ScrollTrigger; disabled in the app and for reduced motion |
| UI motion (sheets, menus, lists, route changes) | **Motion** (`motion`, v12, `motion/react`) | Layout and shared-element animations, gestures |
| Accessible unstyled primitives | **React Aria Components** (`react-aria-components`) | Menus, dialogs, tabs, combobox, date picker; zero default styling, so our look is our own |
| Optional 3D hero (desktop only, lazy) | `@react-three/fiber@8` + `@react-three/drei@9` + `three` | Glass lens with refraction over a house blueprint; v8/v9 because v9/v10 need React 19 |
| Icons | `@phosphor-icons/react` | Distinct from lucide |
| QR code (glasses pairing) | `qrcode` | Server-side SVG generation |
Do NOT add: shadcn/ui, Radix themes, lucide, MUI, Chakra, Mantine, Bootstrap, animate.css,
AOS, canvas-confetti. Build the effects ourselves on top of the libraries above.
Remove the legacy classes from `globals.css` as each screen is converted; delete the file's
legacy section when done.

Performance budget: landing LCP < 2.5 s on 4G mid-range Android; landing JS < 180 KB gzip
before the optional 3D chunk; 3D loads only on desktop with WebGL2 and no reduced-motion.
Every animation uses transform/opacity only. All motion respects `prefers-reduced-motion`
(GSAP `matchMedia`, Motion `useReducedMotion`), with a static, still-beautiful fallback.

---

## 3. INFORMATION ARCHITECTURE
Split the app with route groups so each area gets its own layout:
```
app/
  (marketing)/   layout: <SiteHeader/> + full-width sections + <SiteFooter/>
    page.tsx                 landing
    funciones/[slug]/        one deep page per feature (optional, U6)
    profesionales/  alcaldias/  empresas/  privacy/  terms/
  (auth)/        layout: split screen, no header nav
    login/  signup/  connect-glasses/
  (app)/         layout: <AppShell role=…> (sidebar desktop, tab bar mobile)
    scan/ quote/ book/ jobs/ contracts/ passport/ projects/ fund/   (customer)
    pro/…                                                         (worker)
    empresa/…                                                     (company)
    city/…                                                        (municipality)
    admin/…
```
Remove the `max-w-md` wrapper from the root layout. Marketing uses a 1280 px container with
full-bleed sections; app pages use a 1200 px content area beside the sidebar; reading pages
cap text at 68 characters.

### Roles (4 user-facing + admin)
| Role key | UI name (ES / EN) | Who |
| --- | --- | --- |
| `customer` | Cliente / Customer | Households and small businesses needing work done |
| `pro` | Profesional / Pro | Independent workers (plumbers, electricians, masons…) |
| `company` (NEW) | Empresa / Company | Contractor companies with a team of pros |
| `city_operator` | Alcaldía / Municipality | Municipal office that receives, triages and assigns public repairs |
| `admin` | Admin | TaskLens staff (never one-click) |
`company` needs migration `015_companies.sql`: `companies`, `company_members (company_id,
pro_id, role owner|dispatcher|member)`, jobs gain nullable `company_id`; RLS: members see only
their company's jobs; dispatchers assign jobs to member pros. Add to `getSession()` and tests.

---

## 4. BLOCKS (in order; each ends with screenshots at 375 / 768 / 1440 px, light + dark)

### U1. Foundation (tokens, fonts, primitives) — Oct 30 AM
- `app/styles/tokens.css`, Tailwind config mapped to tokens, dark mode via `data-theme` with
  system default and a toggle.
- Primitives in `components/ui/` built on React Aria: Button (primary / secondary / ghost /
  danger; sizes; loading state with a progress sweep), IconButton, Input, Textarea, Select,
  Combobox, DatePicker, Tabs, Menu, Dialog, Sheet (bottom on mobile, side on desktop),
  Tooltip, Toast, Badge, Avatar, Skeleton, EmptyState, ErrorState.
- Signature components in `components/blueprint/`: `GridBackdrop`, `Viewfinder` (animated
  corner brackets), `Annotation` (leader line + mono label, draws in), `DimensionLine`,
  `StampSeal` (verified animation), `ScanBeam`, `MagneticButton`, `SpotlightCard`
  (cursor-follow light on hover, desktop only), `CountUp`, `Marquee`.
- Motion tokens: durations 120/200/320/600 ms; easings `--ease-out (.22,.9,.3,1)`,
  `--ease-spring (.34,1.4,.44,1)`.
- Done: a hidden `/dev/kit` page (404 in production) shows every component in both themes.

### U2. Site header, footer and global navigation — Oct 30 PM
**Header** (`components/site/SiteHeader.tsx`), sticky:
- Transparent over the dark hero; on scroll it condenses (height 76 → 60 px), gains
  `--surface` with backdrop blur and a hairline border (Motion, scroll-linked).
- Left: logo (wordmark + a viewfinder-bracket mark; animate the brackets closing on hover).
- Center nav: Cómo funciona · Funciones (mega-menu, see below) · Profesionales · Empresas ·
  Alcaldías · Preguntas.
- Right: ES/EN toggle, theme toggle, **Iniciar sesión** (ghost) and **Crear cuenta**
  (primary, magnetic). Both always visible on desktop.
- **Funciones mega-menu**: 3 columns with icon, name and one-line value for every feature
  (Escaneo IA, Cotización, Contratos, Calendario, Pago protegido, Pasaporte del hogar,
  Planificador de proyectos, Pago desde el extranjero, Mediación, Copiloto en lentes,
  TaskLens para Alcaldías) + a promo tile "Mira el demo (2 min)" that opens the video.
- Mobile: logo + "Entrar" button + menu button; menu opens a full-screen sheet with large
  links staggered in, the two auth buttons pinned at the bottom, and the language toggle.
- Signed in: the auth buttons are replaced by a notification bell and the **user menu**
  (avatar, name, role badge, role switcher if the user has several roles, links per role,
  "Conectar lentes Meta", language, theme, sign out).
**Footer**: 4 columns (Producto, Para quién, Recursos, Legal), language + country, "Hecho con
IA de Meta" line, social links placeholders.

### U3. Auth: sign in / sign up with "phone or Meta glasses" — Oct 30 PM
Split-screen layout: left = form; right (desktop) = dark blueprint panel with a looping
animation of the current step (phone scanning, or glasses POV).
**Step 1 — ¿Quién eres?** Four large selectable cards with Phosphor duotone icons and a
one-line description: Cliente · Profesional · Empresa · Alcaldía. (Alcaldía and Empresa
show "Requiere verificación" and route to an application form after sign-up.)
**Step 2 — ¿Cómo te conectas?** Two cards:
- **Con mi celular**: email magic link (existing Supabase flow), optional phone number;
  continue to the role's home.
- **Con lentes Meta**: explains honestly that the glasses connect through the TaskLens
  companion app on an Android phone paired with the Meta AI app. Shows:
  1. a QR code / deep link to install or open the companion app (`tasklens://connect?code=…`),
  2. a 6-character pairing code valid 10 minutes (server: `glasses_pairings` table,
     code hash only, single use, rate-limited),
  3. a live status (Waiting → Phone connected → Glasses ready) via Supabase Realtime,
  4. "Probar con la cámara del celular" fallback link.
  If the companion app isn't available to this user (developer preview), say so and offer
  the phone flow. Never claim glasses work where they haven't been tested.
**Step 3 — Perfil mínimo** per role (name, comuna/municipio, trade for pros, company name
for Empresa, municipality for Alcaldía).
- Demo access: a discrete "Explorar con una cuenta demo" link opens a sheet with
  Cliente / Profesional / Empresa / Alcaldía demo buttons (production: seeded accounts,
  server-side sign-in, rate-limited; admin never one-click).
- Language follows the site toggle (fix the hardcoded `"en"`). All errors are friendly and
  specific; buttons show loading states; the magic-link "sent" state shows an animated
  envelope and the email used, with "Reenviar" after 30 s.

### U4. App shell and role menus — Oct 31
`components/app/AppShell.tsx`: desktop = collapsible left sidebar (icons + labels, section
headers, active item with an orange edge marker and Motion `layoutId` slide), top bar with
breadcrumb, global search (⌘K / Ctrl+K command palette built on React Aria Combobox:
jump to jobs, contracts, pros, settings), notifications and the user menu. Mobile = bottom
tab bar (max 5 items) with a raised center action; "Más" opens a sheet with the rest.
Route transitions: content cross-fades and slides 8 px (Motion `AnimatePresence`).

| Role | Primary nav (mobile tab bar in **bold**) | Center action |
| --- | --- | --- |
| Cliente | **Inicio**, **Mis trabajos**, **Pasaporte**, **Mensajes**, Proyectos, Contratos, Pagos, Familia que paga, Ajustes | **Escanear** (viewfinder button) |
| Profesional | **Hoy** (day plan), **Solicitudes**, **Calendario**, **Ganancias**, Trabajos, Portafolio, Verificación, Modo lentes, Ajustes | **Iniciar trabajo** |
| Empresa | **Panel**, **Despacho** (assign jobs to team), **Equipo**, **Calendario del equipo**, Trabajos, Facturación, Contratos, Ajustes | **Asignar** |
| Alcaldía | **Tablero**, **Mapa de reportes**, **Cola de triage**, **Contratistas**, SLA y métricas, Reportes públicos, Ajustes | **Despachar** |
| Admin | Verificaciones, Disputas, Usuarios, Demo reset, Salud del sistema | — |

Each role's home is a real dashboard, not a list:
- Cliente: hero card "¿Qué hay que arreglar hoy?" with the scan button, active jobs with
  live status steppers, upcoming appointments, passport reminders, pending signatures.
- Profesional: today's route on the map with ETAs, earnings this week (CountUp), new
  requests as swipeable cards (accept / decline), rating and trust score breakdown.
- Empresa: team availability strip, unassigned jobs queue with drag-to-assign onto a team
  member (React Aria drag and drop), jobs by status, revenue.
- Alcaldía: map with clustered reports, triage queue by severity, SLA timers turning amber
  then red, contractor performance table, "publish status" toggle for the public page.

### U5. Landing page, rebuilt — Oct 31 – Nov 1
Goal: in 10 seconds a judge understands the broken status quo; in 60 seconds they
understand every feature; in 2 minutes they've watched the demo.
No invented statistics: any number needs a source or uses a `{{SOURCE_NEEDED}}` placeholder
the owner fills. Describe institutions by pattern, never by name. ES primary, EN complete.
All landing copy moves to `content/landing.{es,en}.ts` (typed), not inline.

Sections, in order:
1. **Hero (dark blueprint)** — kicker "Para hogares, profesionales y alcaldías de El Salvador".
   Headline (SplitText line-by-line reveal): "Tu reparación, cotizada en segundos. No en semanas."
   Sub (2 lines max) + CTAs: "Escanear un problema" (magnetic, primary) and
   "Ver demo (2 min)" (opens video modal).
   **Signature effect — "The Lens"**: a real photo of a damaged wall/sink fills the right
   half. A circular lens follows the cursor (on mobile it auto-glides along a path); inside
   the lens the photo shows the AI view: SAM mask in orange, annotation callouts drawing in
   ("Sifón corroído", "Fuga activa", "$120–220", "1.5 h"), and a faint blueprint grid.
   Implementation: two stacked layers, top layer revealed with `clip-path: circle()` driven
   by GSAP `quickTo`; annotations are DOM elements positioned in % so they stay sharp.
   Optional desktop 3D variant (lazy): a refractive glass lens (`MeshTransmissionMaterial`)
   over the same photo; ship 2D first, 3D only if Lighthouse stays ≥ 90.
   Below the fold edge: a marquee of trades (Fontanería · Electricidad · Albañilería …).
2. **El problema hoy** — three large cards that tilt slightly toward the cursor:
   *Esperar* (requests go through one central office or company; days or weeks),
   *Adivinar* (no price until someone visits), *Arriesgar* (skilled labor found by word
   of mouth; paying upfront with no guarantee). Each card has a small looping illustration
   built from blueprint lines (SVG, drawn on scroll).
3. **La carrera (Hoy vs. TaskLens)** — pinned section. Two horizontal tracks animate as the
   user scrolls: the "Hoy" track crawls through Reportar → Esperar visita → Esperar
   cotización → Esperar reparación with a day counter; the "TaskLens" track completes
   Escanear → Cotización → Contrato → Reservado → Verificado → Pago liberado. Label it
   "Ilustrativo". Ends with the TaskLens track stamping a green "Verificado" seal.
4. **Cómo funciona** — 4 steps (Mira · Habla · Firma · Verifica). Horizontal scroll on
   desktop (pinned), vertical stack on mobile; each step has a short looping product clip.
5. **Feature theater** (the core of the page) — a phone mockup is pinned in the center/right
   while feature chapters scroll on the left; the phone screen cross-fades to the matching
   real screenshot or short screen recording. One chapter per feature, each with:
   name, one-sentence promise, "Cómo funciona" in 3 bullets, "Tecnología Meta" chips,
   and "Para quién" chips. Chapters:
   Escaneo y cotización IA · Contratos inteligentes y firma · Calendario inteligente y ruta del día ·
   Pago protegido (PayPal, liberado al verificar) · Verificación antes/después ·
   Pasaporte del hogar y garantías · Planificador de proyectos (video → fases → cuadrilla) ·
   Pago desde el extranjero · Mediación justa · Copiloto en lentes para profesionales.
   Each chapter links to `/funciones/[slug]` (U6).
6. **Demo video** — a full-width cinema block: 16:9 frame inside viewfinder brackets,
   custom poster with a large play button, chapter markers under it (Escaneo 0:00 ·
   Contrato 0:25 · …). Source configured in `content/landing.*.ts` as
   `demoVideo: { provider: "youtube" | "file", id?: string, src?: string, poster: string,
   chapters: {label, t}[] }`, overridable by `NEXT_PUBLIC_DEMO_VIDEO_URL`. YouTube loads
   only on click via `youtube-nocookie.com` (add to CSP `frame-src`); self-hosted MP4 uses
   `<video>` with captions (`.vtt` ES/EN). Empty source shows a tasteful "Demo disponible
   pronto" state, never a broken embed.
7. **Para cada lado del trabajo** — three tabs (React Aria Tabs, animated underline):
   Clientes · Profesionales · Empresas, each with 4 concrete benefits and a screenshot.
8. **TaskLens para Alcaldías** — dark section with an animated map of clustered reports
   (static SVG map of El Salvador's departments, dots pulsing in), the triage → dispatch →
   proof flow, and a CTA "Solicitar acceso para mi alcaldía" (form: municipality, name,
   role, email; stored in a `city_access_requests` table; rate-limited).
9. **Confianza y seguridad** — escrow, verification, verified pros, safety flags, data
   protection; each as an icon + 2-line explanation; a green stamp seal animates on view.
10. **Hecho con IA de Meta** — 5 cards (Muse Spark, Muse Voice Transcribe, Muse Image,
    SAM 3.1, Ray-Ban Meta glasses) each showing *what it does in TaskLens* with a micro demo
    (e.g., a waveform turning into text for Voice Transcribe).
11. **Preguntas frecuentes** — React Aria Disclosure, smooth height animation, 8 questions.
12. **CTA final + footer** — big headline "Mira el problema. Resuélvelo hoy.", two CTAs.

Done: Lighthouse mobile ≥ 90 (performance, accessibility, best practices, SEO); no layout
shift from fonts or the lens; keyboard reachable; works with reduced motion.

### U6. Feature deep pages `/funciones/[slug]` — Nov 1
One template, content per feature: hero with the feature's own visual, problem → solution,
step-by-step with screenshots, Meta tech used, FAQs, CTA. Statically generated, linked from
the mega-menu and the feature theater. Good for judges who want detail and for SEO.

### U7. Screen polish pass — Nov 1 – Nov 2 (before 8 PM freeze)
Convert every app screen to the new system, in this order, with these moments:
- `/scan`: full-bleed camera inside `Viewfinder`; hold-to-talk mic with live waveform
  (Web Audio analyser); on capture the shutter flashes, the photo shrinks into a card and the
  progress shows annotated steps "Mirando… Midiendo… Cotizando… Buscando profesionales…".
- `/quote`: photo with the SAM mask drawing in, annotations attached to the damage, price as
  a large CountUp range, steps as a vertical blueprint list, safety flags as warning callouts.
- `/book`: map with pro pins that rise in; ProCards with trust-score ring; slot chips;
  PayPal button in a sheet; success = stamp seal + "Pago protegido" explainer.
- `/contracts/[id]`: document view with a sticky plain-language summary, signature pad,
  both signatures appear with a pen-stroke animation; hash shown in mono.
- `/jobs/[id]`: status stepper + live timeline; new events slide in (Motion layout).
- `/pro`, `/pro/calendar`, `/empresa`, `/city`: dashboards as defined in U4.
- Every screen: loading skeletons shaped like the content, empty states with a blueprint
  illustration and one clear action, friendly error states with retry.

---

## 5. CONTENT RULES (no more generic copy)
- Every claim is concrete and about TaskLens: show the real flow (photo → "Sifón corroído,
  1.5 h, $120–220" → contract → verified), real feature names, real screens.
- Short sentences, Salvadoran Spanish where natural ("alcaldía", "fontanero", "colonia",
  "municipio"); English is a full translation, not a summary.
- No numbers without a source; no fake testimonials, logos or partner names. If social proof
  is wanted, add an empty "Pilotos" section the owner fills with real names later.

## 6. QUALITY GATES (each block)
- Screenshots at 375 / 768 / 1440 px, light + dark, committed to `docs/screens/ui-v2/`.
- Lighthouse ≥ 90 on `/`, `/login`, `/scan`; axe: zero serious/critical issues.
- Keyboard: every menu, dialog, tab and the command palette fully operable; visible focus.
- Reduced motion: no scroll-jacking, no parallax, no auto-moving lens; everything still legible.
- CSP updated only for what's added (YouTube nocookie `frame-src`); fonts and scripts local.
- No layout shift (CLS < 0.05). Images via `next/image` with sizes; AVIF/WebP.
- Tests: role menus render the right items per role; header shows auth buttons signed out and
  user menu signed in; pairing code expiry and single-use; `company` RLS policies.
- Commit per block; update `PROGRESS.md`; log any cut in `CUT.md`.

## 7. CUT ORDER IF TIME RUNS OUT
3D lens variant → feature deep pages (U6) → horizontal "Cómo funciona" (use vertical) →
Alcaldías map animation (static map). Never cut: header + auth (U2, U3), app shell and role
menus (U4), hero lens effect, feature theater, demo video block.
