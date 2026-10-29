-- TaskLens S5+S6: funding links (pay from abroad) + fair-fix disputes.
-- Tokens are random 32-byte values; store only SHA-256.

create table if not exists funding_links (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  token_hash text unique not null,
  payer_email text default '',
  status text not null default 'open' check (status in ('open','used','expired','refunded')),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  raised_by text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','proposed','resolved','escalated')),
  created_at timestamptz default now()
);

create table if not exists dispute_proposals (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid references disputes(id) on delete cascade,
  kind text not null check (kind in ('redo', 'partial_release')),
  detail text not null,
  amount_usd int,
  created_by text not null default 'ai',
  accepted_by text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);

alter table funding_links enable row level security;
alter table disputes enable row level security;
alter table dispute_proposals enable row level security;

-- Funding links: the token URL is public by design (payer view shows title/price only).
-- No select policies for anon (default deny); server reads via service role.

-- Disputes: visible to the job's parties.
drop policy if exists "disputes parties read" on disputes;
create policy "disputes parties read" on disputes
  for select using (
    exists (
      select 1 from jobs j
      left join pros p on p.id = j.pro_id
      where j.id = disputes.job_id
        and (j.customer_id = auth.uid() or p.user_id = auth.uid())
    )
  );

drop policy if exists "proposals parties read" on dispute_proposals;
create policy "proposals parties read" on dispute_proposals
  for select using (
    exists (
      select 1 from disputes d join jobs j on j.id = d.job_id
      left join pros p on p.id = j.pro_id
      where d.id = dispute_proposals.dispute_id
        and (j.customer_id = auth.uid() or p.user_id = auth.uid())
    )
  );
