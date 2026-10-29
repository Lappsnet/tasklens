-- TaskLens P1 fix: auth onboarding that actually works in production.
-- Without this, magic-link users get NO profiles row (role defaults to
-- customer forever) and approved pros can never log in as pro.

-- 1. Link pro rows to the application that created them.
alter table pros add column if not exists application_id uuid references pro_applications(id) on delete set null;

-- 2. seed-demo-users.ts upserts pros on user_id -> needs a real unique constraint
-- (multiple NULLs stay allowed, so the nameless seed rows are unaffected).
alter table pros add constraint pros_user_id_unique unique (user_id);

-- 3. Signup trigger: every new auth user gets a customer profile; if an APPROVED
-- pro application holds the same email, promote to pro and link the pro row.
-- SECURITY DEFINER so it bypasses RLS (no insert policies by design).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'customer', coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  if exists (
    select 1 from public.pro_applications a
    where a.status = 'approved' and lower(a.email) = lower(new.email)
  ) then
    update public.profiles set role = 'pro' where id = new.id;
    update public.pros set user_id = new.id
    where application_id in (
      select a.id from public.pro_applications a
      where a.status = 'approved' and lower(a.email) = lower(new.email)
    )
    and user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
