-- TaskLens S1: Contract Studio tables. Clause library lives in
-- packages/ai/contracts/clauses/*.md; the model only fills/selects those clauses.

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','partially_signed','fully_signed','voided')),
  language text not null default 'es',
  title text not null,
  body_es text not null,
  body_en text not null,
  summary_es text not null,
  summary_en text not null,
  price_usd int not null,
  warranty_days int not null default 30,
  pdf_path text,
  pdf_sha256 text,
  created_at timestamptz default now()
);

create table if not exists contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id) on delete cascade,
  role text not null check (role in ('customer','pro')),
  signer_name text not null,
  signature_png text not null,
  email text not null,
  signed_at timestamptz default now(),
  ip text,
  user_agent text,
  unique(contract_id, role)
);

create table if not exists change_orders (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id) on delete cascade,
  description text not null,
  scope_delta text not null,
  price_delta_usd int not null default 0,
  time_delta_hours numeric(5,2) not null default 0,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  authorization_id text,
  created_at timestamptz default now()
);

alter table contracts enable row level security;
alter table contract_signatures enable row level security;
alter table change_orders enable row level security;

-- Parties read their own contract + signatures + change orders. Writes via service role.
drop policy if exists "contracts parties read" on contracts;
create policy "contracts parties read" on contracts
  for select using (
    exists (
      select 1 from jobs j
      left join pros p on p.id = j.pro_id
      where j.id = contracts.job_id
        and (j.customer_id = auth.uid() or p.user_id = auth.uid())
    )
  );

drop policy if exists "signatures parties read" on contract_signatures;
create policy "signatures parties read" on contract_signatures
  for select using (
    exists (
      select 1 from contracts c join jobs j on j.id = c.job_id
      left join pros p on p.id = j.pro_id
      where c.id = contract_signatures.contract_id
        and (j.customer_id = auth.uid() or p.user_id = auth.uid())
    )
  );

drop policy if exists "change_orders parties read" on change_orders;
create policy "change_orders parties read" on change_orders
  for select using (
    exists (
      select 1 from contracts c join jobs j on j.id = c.job_id
      left join pros p on p.id = j.pro_id
      where c.id = change_orders.contract_id
        and (j.customer_id = auth.uid() or p.user_id = auth.uid())
    )
  );
