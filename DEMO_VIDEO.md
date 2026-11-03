# TaskLens demo video — 3-minute plan for regular (non-tech) people

**Goal:** anyone — a homeowner, a pro, a judge — understands in 3 minutes what
TaskLens does, why it matters, and that it really works end to end.
**Language:** simple words. No "escrow", no "API", no "RLS". Say "money held
safely", "the app", "only you can see your stuff".
**Format:** phone screen recording (375 px wide) + your voice over it. Or two
phones: one as the customer, one as the pro — even better.
**Needs:** the app running (mock mode is fine, no keys needed), one demo photo
(use **Try demo photo** on `/scan`), reset first via `/admin` → Reset demo.

## The story in one line

> "Fixing a repair today takes weeks of calls, visits and risky upfront cash.
> TaskLens turns it into: look, speak, approve — and the money only moves when
> the work is proven done."

## Shot list (with timestamps)

| Time | What viewers see | What you say (simple script) |
|---|---|---|
| 0:00–0:20 | Landing page on a phone. Slow scroll: headline, a real job photo, "Trabajos en vivo" cards. | "This is TaskLens. In El Salvador, getting a repair means weeks of calls, waiting for visits, and paying upfront with no guarantee. TaskLens fixes that with your camera and your voice." |
| 0:20–0:45 | `/scan`: tap **Try demo photo**, hold-to-talk waveform while you say "se quemó el enchufe". Tap **Get my quote**. Progress reads: looking… estimating… | "Look at the problem. Describe it out loud — Spanish or English. The app's AI looks at the photo and listens." |
| 0:45–1:10 | `/quote`: price "$120–220" counts up, damage box draws on the photo, steps + materials list. Scroll slowly. | "Seconds later you get a price range, a repair plan, and the damage marked on your photo. No visit needed just to know the price." |
| 1:10–1:35 | `/book`: map with pros, 3 pro cards with ratings, pick a slot, **Confirm**. Receipt: "held". | "Pick a verified pro and a time. Your money is held safely — the pro doesn't get it yet. Nothing is charged behind your back." |
| 1:35–2:15 | Switch to pro view `/pro/jobs/[id]`: big step buttons, checklist ticks, a voice note, before/after photos, **Submit**. Verdict: pass. | "The pro works hands-free, step by step, and uploads proof. The AI compares before and after — and only a passing grade releases the payment." |
| 2:15–2:40 | Back to customer `/jobs/[id]`: status stepper, live timeline sliding in, before/after slider, payment `released`, 5-star rating. | "You watch everything live. Before and after, side by side. Then you rate — and every job stays saved with its warranty." |
| 2:40–3:00 | `/pasaporte` (warranties) → `/city` board (municipal reports) → landing CTA. End card: "Mira el problema. Resuélvelo hoy." | "Every repair is recorded. Even city halls can track street reports this way. Look at the problem — solve it today." |

## Recording tips (keep it human)

1. **Reset first**: `/admin` → Reset demo, so every take starts clean.
2. **Speak slowly**, one idea per shot. Smile — you're showing neighbors, not engineers.
3. **Show fingers tapping**: viewers trust what they see tapped, not told.
4. **If a take breaks**: reset and go again. Never edit the database by hand.
5. **Two languages**: record the Spanish take first, then toggle EN/ES and repeat — same 3 minutes.
6. **No real money**: everything runs in test mode; say so out loud ("this is test money").
7. Keep the video **under 200 MB**; export 1080p MP4 + a ≤10 MB GIF cut for the README.

## What viewers should remember (say it twice)

1. Photo + voice → price in seconds.
2. Money held until the work is proven.
3. Everyone watches everything live; everything is saved.
