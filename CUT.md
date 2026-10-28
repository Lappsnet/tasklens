# TaskLens — Day 1 cut log (fallback decisions)
# Rule: if a Meta API or glasses SDK blocks >45 min, switch to fallback and log here.

- 2026-10-28 Day1: SAM via Model API (model sam-3.1 over POST /v1/responses), NOT $SAM_ENDPOINT_URL.
  Docs show no standalone hosted SAM endpoint; removed SAM_ENDPOINT_URL from env plan.
  Fallback already in place: use ai_spec.damage_box overlay, never block flow.
- 2026-10-28 Day1: Wearables Device Kit has no public endpoint in dev.meta.ai docs.
  Developing against Mock Device Kit (apps/glasses-android MockDeviceKit.kt) first, per brief.
- (append new entries as they happen)
