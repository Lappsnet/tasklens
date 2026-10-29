-- TaskLens P0-1: Postgres-backed sliding-window rate limiting.
-- Service role only (no policies = default deny). Called via RPC from API routes.

create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

alter table rate_limits enable row level security;

create or replace function rate_limit_hit(p_key text, p_limit int, p_window_secs int)
returns boolean
language plpgsql
as $$
declare
  v_start timestamptz;
  v_count int;
begin
  select window_start, count into v_start, v_count
    from rate_limits where key = p_key for update;
  if not found or now() - v_start > make_interval(secs => p_window_secs) then
    insert into rate_limits(key, window_start, count) values (p_key, now(), 1)
    on conflict (key) do update set window_start = now(), count = 1;
    return true;
  elsif v_count < p_limit then
    update rate_limits set count = count + 1 where key = p_key;
    return true;
  else
    return false;
  end if;
end;
$$;
