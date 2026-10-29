-- TaskLens Day 6: replace demo allow-all policies with per-role least privilege.
-- Default deny: no policy = no access. Service role bypasses RLS for server paths.
-- Run: psql $SUPABASE_DB_URL -f 003_rls_lockdown.sql

-- Drop the Day 1 permissive demo policies.
drop policy if exists "open all scans" on scans;
drop policy if exists "open all jobs" on jobs;
drop policy if exists "open all events" on job_events;
drop policy if exists "open all profiles" on profiles;
drop policy if exists "open all payments" on payments;
-- pros + availability stay publicly readable (marketplace listing).
-- ("open read pros" / "open read availability" from 001_schema.sql remain.)

-- profiles: users read their own row only. Writes via service role (trigger on signup).
drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles
  for select using (auth.uid() = id);

-- scans: owners (customer_id) read their own; inserts go through the service role
-- (server API validates the session and sets customer_id), so no direct-insert policy.
drop policy if exists "scans owner read" on scans;
create policy "scans owner read" on scans
  for select using (auth.uid() = customer_id);
-- pros need the scan spec for jobs assigned to them: read via the assigned job.
drop policy if exists "scans via assigned job" on scans;
create policy "scans via assigned job" on scans
  for select using (
    exists (
      select 1 from jobs j
      join pros p on p.id = j.pro_id
      where j.scan_id = scans.id and p.user_id = auth.uid()
    )
  );

-- jobs: customers read their own; pros read jobs assigned to their pro rows.
drop policy if exists "jobs customer read" on jobs;
create policy "jobs customer read" on jobs
  for select using (auth.uid() = customer_id);
drop policy if exists "jobs pro read" on jobs;
create policy "jobs pro read" on jobs
  for select using (
    exists (select 1 from pros p where p.id = jobs.pro_id and p.user_id = auth.uid())
  );
-- No insert/update/delete policies: writes happen only through the service role
-- in API routes (booking, transitions, verification), which validate sessions server-side.

-- job_events: readable when the parent job is readable.
drop policy if exists "events via job" on job_events;
create policy "events via job" on job_events
  for select using (
    exists (
      select 1 from jobs j
      left join pros p on p.id = j.pro_id
      where j.id = job_events.job_id
        and (j.customer_id = auth.uid() or p.user_id = auth.uid())
    )
  );

-- payments: customer sees payments for their own jobs. No direct writes.
drop policy if exists "payments customer read" on payments;
create policy "payments customer read" on payments
  for select using (
    exists (select 1 from jobs j where j.id = payments.job_id and j.customer_id = auth.uid())
  );

-- Private media bucket for job photos (server uploads via service role;
-- clients receive short-lived signed URLs from /api/media/sign).
insert into storage.buckets (id, name, public)
  values ('media', 'media', false)
  on conflict (id) do nothing;
-- No storage policies: bucket is service-role only (default deny).
