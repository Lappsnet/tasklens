# TaskLens — 60-second demo recording script (Day 7)

Target: one continuous 60 s GIF/MP4, 375 px wide viewport (mobile), EN UI.
Prereqs: `pnpm --filter web dev` on `http://localhost:3000`, no keys needed (mock mode).

## Reset first (5 s)
1. Open `http://localhost:3000/login` → click **admin** → **Admin** → **Reset demo**.
   Confirms clean state for every take.

## The 60 seconds
| Time | Shot | Action |
|------|------|--------|
| 0–5 | `/scan` | "Look at the problem." Tap **Try demo photo** (or upload a sink photo), keep the default transcript. |
| 5–8 | `/scan` | Tap **Get my quote**. Staged progress: Uploading → Looking → Estimating. |
| 8–18 | `/quote/[id]` | Quote lands (~1 s): $120–$220, repair plan, damage-box overlay on the photo. Scroll once. Tap **Book a pro**. |
| 18–28 | `/book/[id]` | Top 3 pros with reasons + slots. Keep Carlos, pick a slot, **Confirm booking**. Receipt: job ID + TEST-mode hold. |
| 28–45 | `/pro/jobs/[jobId]` | Job mode: **Start route** → **Arrived — start work** → tick 2 checklist steps → record a 3 s voice note → **Submit** with an after photo. Verdict: pass. |
| 45–55 | `/jobs/[jobId]` | Customer live view: status `completed`, full event log, payment `succeeded`. |
| 55–60 | `/` | Land back home. End card: "Look. Speak. Book a pro." |

## Recording tips
- Chrome DevTools → device toolbar → iPhone SE (375×667). Record with ScreenToGif / QuickTime / Xbox Game Bar, export ≤ 10 MB GIF to `apps/web/public/demo.gif`, then update README.
- If a take breaks mid-flow, Admin → Reset demo and go again — no manual DB edits, ever.
- Voice note needs a mic; on mute machines, type the transcript instead (same pipeline).
- Spanish take: toggle EN/ES on `/scan` and repeat — same 60 s, fully translated UI.

## What the judges should notice
1. Phone scan → AI quote in ~1 s (price range, plan, materials, damage highlight).
2. Explicit booking confirmation + TEST escrow hold (never auto-charges).
3. Hands-free pro flow with a live customer view.
4. Pass verdict releases payment; every step is an event in the log.
