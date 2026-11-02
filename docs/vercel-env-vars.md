# Vercel env vars — exact values, where to get them

Paste method (fastest): Vercel Dashboard → your project → **Settings →
Environment Variables** → paste a `KEY=value` block (template in §2) →
tick **Production** + **Preview** for every row → **Save** → **Redeploy**.

Rules:
- NEVER commit real values to git. Values live in Vercel + your local
  `apps/web/.env.local` only.
- `NEXT_PUBLIC_*` ships to the browser. Server-only keys
  (`MODEL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_SECRET`,
  `DEMO_*_PASSWORD`, `STRIPE_*`) must NEVER have a `NEXT_PUBLIC_` prefix.
- After saving, run `node scripts/check-env.mjs --prod` mentally against
  the table below: the three `REQUIRED TO BOOT` rows must all be set or
  production refuses to start (`[tasklens] production boot refused`).

> [!NOTE]
> Two common mistakes (seen in chat — fix before pasting):
> 1. The API URL is `https://<ref>.supabase.co`, NOT the dashboard URL
>    (`supabase.com/dashboard/project/<ref>`). The dashboard URL will
>    break every Supabase call.
> 2. Keys starting with `sb_secret_` are the **service_role** key and must
>    ONLY go in `SUPABASE_SERVICE_ROLE_KEY`. The anon key starts with
>    `sb_publishable_`. Swapping them publishes full database access in
>    the browser bundle.

## 1. Copy-paste template (fill the blanks, then paste)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_<...>
SUPABASE_SERVICE_ROLE_KEY=sb_secret_<...>
STORAGE_BUCKET=media
MODEL_API_KEY=<meta-key>
MODEL_BASE_URL=https://api.meta.ai/v1
MODEL_ID=muse-spark-1.3
MODEL_FALLBACK_ID=muse-spark-1.2
ASR_MODEL=muse-voice-transcribe-1.0
IMAGE_MODEL=muse-image-1.0
SAM_MODEL=sam-3.1
PAYPAL_CLIENT_ID=<paypal-sandbox-client-id>
PAYPAL_CLIENT_SECRET=<paypal-sandbox-secret>
PAYPAL_WEBHOOK_ID=<paypal-webhook-id>
PAYPAL_ENV=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<same-as-PAYPAL_CLIENT_ID>
PLATFORM_FEE_PCT=10
NEXT_PUBLIC_MAPBOX_TOKEN=pk.<...>
NEXT_PUBLIC_APP_URL=https://<your-domain>
DEMO_CUSTOMER_EMAIL=demo-customer@tasklens.example
DEMO_CUSTOMER_PASSWORD=<12+-chars-you-invent>
DEMO_PRO_EMAIL=demo-pro@tasklens.example
DEMO_PRO_PASSWORD=<12+-chars-you-invent>
```

Environments for every row: **Production + Preview** (leave Development
to your local `.env.local`).

## 2. Where each value comes from

### Supabase (REQUIRED TO BOOT — 3 keys + bucket)

| Key | Where to click | What it looks like |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → your project → **Settings (gear) → API → Project URL** | `https://<ref>.supabase.co` (NOT the dashboard URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → **API Keys → `anon` / `publishable`** (Reveal → Copy) | starts with `sb_publishable_` |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → **API Keys → `service_role` / `secret`** (Reveal → Copy). Never in the browser. | starts with `sb_secret_` |
| `STORAGE_BUCKET` | Type literally `media` | `media` (bucket must already exist: **Storage → `media` → Private)** |

### Meta AI (REQUIRED TO BOOT)

| Key | Where to click | What it looks like |
| --- | --- | --- |
| `MODEL_API_KEY` | https://dev.meta.ai → developer dashboard → **API keys → Create** (copy once) | long random token, server-only |
| `MODEL_BASE_URL` | Type literally | `https://api.meta.ai/v1` |
| `MODEL_ID` / `MODEL_FALLBACK_ID` / `ASR_MODEL` / `IMAGE_MODEL` / `SAM_MODEL` | Type literally (change only if `dev.meta.ai/docs` says otherwise — docs win) | `muse-spark-1.3`, `muse-spark-1.2`, `muse-voice-transcribe-1.0`, `muse-image-1.0`, `sam-3.1` |

### PayPal sandbox (money — test with fake money)

| Key | Where to click | What it looks like |
| --- | --- | --- |
| `PAYPAL_CLIENT_ID` | https://developer.paypal.com → **Apps & Credentials → Sandbox → Create App** → copy Client ID | `Ab...` (~80 chars) |
| `PAYPAL_CLIENT_SECRET` | Same app → **Show** secret (server-only) | `EO...` (~80 chars) |
| `PAYPAL_WEBHOOK_ID` | Same app → **Webhooks → Add** (Orders v2 events) → copy ID | `WH-...` |
| `PAYPAL_ENV` | Type literally (until a verified Business account exists) | `sandbox` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | **Paste the same value as `PAYPAL_CLIENT_ID`** | identical to above |
| `PLATFORM_FEE_PCT` | Type literally | `10` |

Also create one **sandbox Business** + one **sandbox Personal** account
(PayPal Dashboard → Sandbox Accounts) to test paying — no real money moves.

### Maps (optional, graceful fallback without it)

| Key | Where to click | What it looks like |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | https://account.mapbox.com → **Tokens → Create token** | starts with `pk.` |

### App URL (REQUIRED)

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain: `https://<project>.vercel.app` (no trailing slash) |

### Demo logins (recordings + judges)

| Key | Value |
| --- | --- |
| `DEMO_CUSTOMER_EMAIL` | `demo-customer@tasklens.example` (must match a user you create) |
| `DEMO_CUSTOMER_PASSWORD` | password YOU invent (12+ chars, server-only) |
| `DEMO_PRO_EMAIL` | `demo-pro@tasklens.example` |
| `DEMO_PRO_PASSWORD` | password YOU invent (12+ chars, server-only) |

Create the users first (local terminal, keys stay local):
`SUPABASE_URL=<Project URL> SUPABASE_SERVICE_ROLE_KEY=<service_role> DEMO_USER_PASSWORD=<12+chars> pnpm --filter @tasklens/db seed-demo`
Then paste the SAME emails/passwords into Vercel. The admin user is
created manually in Supabase Dashboard → Auth → Users (never one-click).

### Explicitly leave UNSET on Vercel

`DEMO_MODE` (production boot treats it as a misconfiguration),
`ASSETLINKS_SHA256_FINGERPRINTS` (only after Play Console app-signing),
`STRIPE_*` (US-only merchants; unsupported in El Salvador — skip).

## 3. Verify after deploy

1. **Deployments → latest → Logs**: must NOT contain
   `[tasklens] production boot refused`. If present, a REQUIRED row is
   missing — the message names it.
2. Open `/` → landing renders. Open `/login` → page renders.
3. Phone test: `/scan` photo + voice → `/quote` in <15 s with a REAL,
   photo-specific quote (mock always returns the same fixture).
4. Money test: `/book` → pay with the sandbox buyer → `held` →
   verify `pass` → `released`.
5. Full gate: `docs/keyed-verification.md` (two phones, loop ×2,
   RLS negatives, record latencies in `PROGRESS.md`).

## 4. If a value is wrong

| Symptom | Fix |
| --- | --- |
| Boot refused, names Supabase | `NEXT_PUBLIC_SUPABASE_URL` is the dashboard URL, not `https://<ref>.supabase.co` |
| Boot refused, names MODEL_API_KEY | key missing/empty, or pasted with quotes/spaces |
| Login emails never arrive | Supabase Auth → custom SMTP sender not set |
| Map blank | token missing/restricted — check domain restrictions in Mapbox |
| Pay buttons do nothing | `NEXT_PUBLIC_PAYPAL_CLIENT_ID` missing or ≠ `PAYPAL_CLIENT_ID` |
| 401 on every API call | anon key is actually the `sb_secret_` key — swap back (urgent) |
