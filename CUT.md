# TaskLens — Day 1 cut log (fallback decisions)
# Rule: if a Meta API or glasses SDK blocks >45 min, switch to fallback and log here.

- 2026-10-29 P1: Business accounts (team pros) deferred past the freeze: approved
  pros cover the demo's crew-booking story (S4 books one pro per trade already);
  teams need new tables + UI with ~zero seconds in a 3-minute video. Revisit post-hackathon.

- 2026-10-29 P0-6: Meta Wearables Device Access Toolkit has no public artifact in
  the developer docs (same finding as Day 1). No 45-min integration attempt was
  possible against docs that don't exist — shipping the Mock Device Kit with a
  real bundled sample photo (`res/raw/sample_leak.jpg`, generated synthetic,
  labeled "sample (mock)" in-app). Real path stays a documented seam.
- 2026-10-28 Day1: SAM via Model API (model sam-3.1 over POST /v1/responses), NOT $SAM_ENDPOINT_URL.
  Docs show no standalone hosted SAM endpoint; removed SAM_ENDPOINT_URL from env plan.
  Fallback already in place: use ai_spec.damage_box overlay, never block flow.
- 2026-10-28 Day1: Wearables Device Kit has no public endpoint in dev.meta.ai docs.
  Developing against Mock Device Kit (apps/glasses-android MockDeviceKit.kt) first, per brief.
- (append new entries as they happen)
- 2026-10-28 Day3: Stripe runs in mock-hold mode (`pi_mock_*`, `requires_capture`) when no
  STRIPE_SECRET_KEY; real manual-capture path is implemented and engages with a key. No Meta
  API blocked progress; nothing cut.
- 2026-10-28 Day2: scan/transcribe API serve deterministic mock spec + mock transcript when
  DEMO_MODE=true or MODEL_API_KEY is unset (works with zero keys; real Muse path needs key).
  Not a cut — real path is implemented and used automatically when a key is present.
