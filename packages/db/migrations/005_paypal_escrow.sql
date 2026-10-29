-- TaskLens P0-2: PayPal-first escrow. Extends payments with provider fields + payouts ledger.

alter table payments add column if not exists provider text default 'stripe';
alter table payments add column if not exists order_id text;
alter table payments add column if not exists authorization_id text;
alter table payments add column if not exists idempotency_key text;
alter table payments add column if not exists captured_usd int;

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  pro_id uuid references pros(id),
  amount_usd int not null,
  fee_usd int not null default 0,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz default now()
);

alter table payouts enable row level security;

-- Pro reads their own payout rows. Service role writes (Day 3 pattern).
drop policy if exists "payouts pro read" on payouts;
create policy "payouts pro read" on payouts
  for select using (
    exists (select 1 from pros p where p.id = payouts.pro_id and p.user_id = auth.uid())
  );
