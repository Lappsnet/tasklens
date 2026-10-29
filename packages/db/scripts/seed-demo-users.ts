/**
 * P0-1: create real Supabase demo accounts (customer, pro) for production.
 * Admin is NEVER created here — an owner creates the admin user in the dashboard.
 *
 * Usage (owner, with keys):
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… DEMO_USER_PASSWORD=… \
 *     pnpm --filter @tasklens/db seed-demo
 *
 * Creates (idempotent):
 *   - demo-customer@tasklens.example / profiles{role: customer}
 *   - demo-pro@tasklens.example / profiles{role: pro} + pros row
 * Password: $DEMO_USER_PASSWORD (min 12 chars). Never commit it.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_USER_PASSWORD;

if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
if (!password || password.length < 12) throw new Error("Set DEMO_USER_PASSWORD (min 12 chars)");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function upsertUser(email: string, role: "customer" | "pro", displayName: string) {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === email);
  const userId =
    found?.id ??
    (await admin.auth.admin.createUser({ email, password, email_confirm: true })).data.user?.id;
  if (!userId) throw new Error(`could not create ${email}`);
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: userId, role, display_name: displayName }, { onConflict: "id" });
  if (profErr) throw new Error(`profiles upsert failed: ${profErr.message}`);
  console.log(`demo ${role}: ${email} (${userId})`);
  return userId;
}

const customerId = await upsertUser("demo-customer@tasklens.example", "customer", "Demo Customer");
const proId = await upsertUser("demo-pro@tasklens.example", "pro", "Demo Pro");

const { error: proErr } = await admin.from("pros").upsert(
  {
    user_id: proId,
    name: "Demo Pro",
    category: "plumbing",
    rating: 4.9,
    reviews: 120,
    rate_usd_hr: 85,
    lat: 13.6929,
    lng: -89.2182,
    city: "San Salvador, SV",
  },
  { onConflict: "user_id" },
);
if (proErr) throw new Error(`pros upsert failed: ${proErr.message}`);
console.log("demo pro linked to pros row. customer:", customerId);
console.log("Set DEMO_CUSTOMER_EMAIL/DEMO_PRO_EMAIL + DEMO_CUSTOMER_PASSWORD/DEMO_PRO_PASSWORD on Vercel.");
