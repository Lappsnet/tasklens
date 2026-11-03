# TaskLens — 3-minute demo video for the judges

`DEMO_VIDEO.md` explains TaskLens to neighbours. This version is for **hackathon judges**: in
3 minutes they must see a real problem, a product that really works end to end, deep use of
Meta's models, and why it can scale from a house to a whole city.

Voiceover is in English (judging is global); the app is shown in Spanish, because that is the
real user, with English captions. About 410 spoken words, a calm pace.

---

## Before you record (do not skip)

1. **Run it with real keys.** Today every AI result runs on mock data (`PROGRESS.md`: keyed
   verification is still owner-blocked). Judges of a Meta AI hackathon will ask whether the
   AI is real. At minimum set `MODEL_API_KEY` in `apps/web/.env.local` and remove `DEMO_MODE`,
   then check that `/scan` → `/quote` returns a real Muse Spark result on your own photo.
   Supabase + PayPal sandbox make the booking/payment part real too (`docs/keyed-verification.md` §2).
2. **Never show a mock result as AI.** If a part still runs on mocks, either cut that shot or
   put a small on-screen label: "Demo data".
3. **Glasses:** only show "through the glasses" footage if it really came from the glasses
   (the companion app runs on the Mock Device Kit). If you have Ray-Ban Meta glasses, record
   the POV clip with them and the Meta AI app. If not, use the phone camera and say
   "glasses or phone" — never "glasses" over phone footage.
4. **Use your own photo for the live scan** (a real outlet, sink or wall at home). The
   showcase photos are labelled "Ejemplos de demostración" and stay that way in the video.
5. Reset the demo (`/admin` → Reset demo), log in as customer in one browser window and as pro
   in another (or use two phones), PayPal **sandbox** buyer ready, notifications muted.
6. Write down the real scan → quote time from your test run. Only that number goes on screen.

---

## The script

| Time | On screen | Voiceover (English) | On-screen text |
| --- | --- | --- | --- |
| **0:00–0:12** Cold open | Close-up POV (glasses if real, else phone): a burnt outlet. Hand points. Spoken in Spanish: *"Se quemó el enchufe."* AI labels draw onto the photo (Lens effect). | *(Spanish line from the person, then)* "In El Salvador, this is where a repair starts… and where it usually gets stuck." | — |
| **0:12–0:32** The problem | Landing hero, then the "La carrera" section: the "Hoy" track crawling through days. Quick cut to "Trabajos en vivo": reported street drains, fallen poles, broken windows. | "Today you call around, wait days for someone to come look, get a price only after the visit, and pay cash upfront with no guarantee. Cities have the same problem: reports pile up in one central office." | "Days or weeks. No price. No guarantee." |
| **0:32–1:02** Look + speak → quote | `/scan`: live camera on your real photo, hold-to-talk waveform while you speak Spanish. Progress steps. `/quote`: damage highlighted, price range counts up, repair steps, materials, safety flag. Show a timer in the corner. | "TaskLens starts with what you see. Point your phone or Meta glasses, describe it in your own words. Muse Voice Transcribe turns speech into text, Muse Spark reads the photo and the words, and SAM 3.1 marks the damage. In seconds you get a price range, a repair plan, the materials, and a safety warning when it's dangerous. No visit needed just to know the price." | "Real Muse Spark call · [your measured time] s"; chips: Muse Spark · Voice Transcribe · SAM 3.1 |
| **1:02–1:25** Book + contract + protected payment | `/book`: map, 3 verified pros with reasons, pick a slot. `/contracts/[jobId]`: bilingual contract + 5-line summary; both sign (two windows side by side). PayPal sandbox approves → "held". | "An agent finds three verified pros nearby and explains why. Nothing is booked until you confirm. Muse Spark drafts a bilingual contract from a fixed clause library, both sides sign, and the payment is authorized but held. The pro doesn't get paid yet." | "Booked only after you confirm" · "Money held until the work is verified" · small: "PayPal sandbox" |
| **1:25–2:02** The pro, hands-free | Pro view `/pro/jobs/[id]`: big step buttons; pro asks the Copilot aloud ("¿Qué cable va primero?"), spoken answer appears; voice note logged; "listo" saves step evidence; after photo; **Verify** → checks turn green one by one. | "On the job, the pro works hands-free. The Copilot answers questions out loud using the job spec, voice notes go straight into the log, and every finished step saves a photo as evidence. When the pro is done, Muse Spark compares before and after against the original plan, step by step. Only a pass releases the money." | "Before / after verified step by step" |
| **2:02–2:22** Customer sees everything | `/jobs/[id]` customer view: timeline filling live, before/after slider, payment "released", 5-star rating. `/passport`: the job saved with its warranty countdown. | "The customer watched all of it live. The payment is released, they rate the pro, and the repair goes into the Home Passport with its photos, contract and warranty. If it fails, they re-scan the same spot and open a warranty claim." | "Every job on record" |
| **2:22–2:42** It scales | `/city`: map of reports, triage queue by severity, SLA timers, dispatch to a contractor. Quick cut to `/empresa` dispatch board. | "The same engine works for a whole city. Neighbours report a broken drain with one photo; the municipality gets an AI-triaged queue, dispatches a contractor, and closes it with verified proof. Contractor companies dispatch their teams the same way." | "Households · Pros · Companies · Municipalities" |
| **2:42–2:54** Under the hood | Simple animated card: 5 Meta tools and what each does; three guardrail lines. | "Five Meta tools, each doing a real job. And the guardrails matter: the AI never books without your yes, never moves money without a passing verification, and every output is validated." | Muse Spark · Muse Voice Transcribe · Muse Image · SAM 3.1 · Ray-Ban Meta glasses |
| **2:54–3:00** Close | End card on the dark blueprint background: logo, tagline, URL, QR to the live demo. | "Look at the problem. Fix it today. TaskLens." | "Mira el problema. Resuélvelo hoy." · your URL |

Notes:
- If Muse Image ran with your real key, add a 3-second insert at 0:58: quote → "Ver resultado
  esperado" showing the generated "after" preview, with the "Muse Image" chip. Otherwise leave
  it out (it is shown as `preview: null` without a key).
- Keep the Spanish in the app; captions translate the important words for judges.
- Say every number from your real test run only. No market statistics unless you have a source.

---

## Tools (all free on your Windows PC)

| Step | Tool | How |
| --- | --- | --- |
| Screen recording | **OBS Studio** (obsproject.com) | One "Display capture" scene at 1920×1080, 60 fps, MP4. Record each segment as its own clip. Two browser windows side by side for customer + pro shots. |
| Phone recording | **scrcpy** (Android, github.com/Genymobile/scrcpy) | Mirrors your Android phone to the PC with no lag; record the mirror in OBS, or `scrcpy --record scan.mp4`. On iPhone use the built-in screen recording. |
| Glasses POV | **Ray-Ban Meta glasses + Meta AI app** | Record the cold-open clip with the glasses; export from the Meta AI app to your phone, then to the PC. Only if you have the glasses. |
| Voiceover | **OBS** or Windows **Sound Recorder**, phone earbuds' mic is fine | Record the voiceover separately, in a quiet room, one row of the table at a time. |
| Editing, zooms, captions | **Microsoft Clipchamp** (comes with Windows 11) | Drag clips onto the timeline in order, add the voiceover track, use "Zoom" on the price/verification moments, turn on **Auto captions** (English), export **1080p MP4**. |
| Title cards, architecture card, end card | **Canva** (connected to this chat) | I can make the 3 cards in TaskLens colours (ink `#0A1220`, orange `#F26A1B`, green `#0E9F6E`) as 1920×1080 PNGs for you to drop into Clipchamp. |
| Music | **YouTube Audio Library** | Pick a calm, "no attribution required" track; keep it at about −20 dB under the voice. |

If you want a heavier editor later, **DaVinci Resolve** (free) gives more control, but
Clipchamp is enough for this and much faster to learn tonight.

---

## Recording and editing checklist

1. Record the real scan → quote first. If it fails with the real key, fix that before anything else.
2. Record segments in script order, 2–3 takes each; reset the demo between full runs.
3. Voiceover: read each row while watching its clip; leave 0.5 s of silence between rows.
4. Edit: cut dead time (loading over ~1 s gets sped up 2×, and the caption says so), zoom on
   the price, the "held" state, the green checks and "released".
5. Watch once with sound off: the captions alone must tell the story.
6. Export 1080p MP4 under 200 MB; upload to YouTube as **Unlisted**; put the link in
   `NEXT_PUBLIC_DEMO_VIDEO_URL` and in the hackathon submission.
7. Final check: total length ≤ 3:00, no mock result shown as AI, no faces or plates unblurred,
   "Ejemplos de demostración" visible wherever showcase photos appear.
