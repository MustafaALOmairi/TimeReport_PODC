-- ======================================================================
-- Time Report - user & password management (Supabase / PostgreSQL)
-- Passwords are stored hashed (bcrypt). Users cannot read the users table.
-- Run PART 1 first. Upload the new app.js + supabase.js. Then run PART 2.
-- ======================================================================

-- ============================ PART 1 ==================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_users (
  id            bigint generated always as identity primary key,
  username      text not null unique,
  password_hash text not null,
  full_name     text not null default '',
  role          text not null default 'user' check (role in ('admin','user')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login    timestamptz
);

create table if not exists public.app_sessions (
  token      uuid primary key default gen_random_uuid(),
  user_id    bigint not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

-- no direct access from the website: only through the functions below
alter table public.app_users    enable row level security;
alter table public.app_sessions enable row level security;
revoke all on public.app_users, public.app_sessions from anon, authenticated;

-- first user (change this password after the first sign-in!)
insert into public.app_users (username, password_hash, full_name, role)
values ('0181', extensions.crypt('PODC', extensions.gen_salt('bf')), 'Admin', 'admin')
on conflict (username) do nothing;

-- sign in: returns {ok, token, name, role}
create or replace function public.login(p_user text, p_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users; t uuid;
begin
  select * into u from public.app_users where username = trim(p_user) and active;
  if not found or u.password_hash <> crypt(p_pass, u.password_hash) then
    perform pg_sleep(1);                       -- slows down password guessing
    return json_build_object('ok', false);
  end if;
  delete from public.app_sessions where expires_at < now();
  insert into public.app_sessions (user_id) values (u.id) returning token into t;
  update public.app_users set last_login = now() where id = u.id;
  return json_build_object('ok', true, 'token', t,
         'name', coalesce(nullif(u.full_name, ''), u.username), 'role', u.role);
end $$;

-- is the token sent by the browser (header x-client-info) a live session?
create or replace function public.is_valid_session() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_sessions s
    join public.app_users u on u.id = s.user_id
    where u.active and s.expires_at > now()
      and s.token::text = coalesce(current_setting('request.headers', true)::json ->> 'x-client-info', '')
  );
$$;

create or replace function public.logout() returns void
language sql security definer set search_path = public as $$
  delete from public.app_sessions
  where token::text = coalesce(current_setting('request.headers', true)::json ->> 'x-client-info', '');
$$;

grant execute on function public.login(text, text) to anon;
grant execute on function public.is_valid_session()  to anon;
grant execute on function public.logout()            to anon;


-- ============================ PART 2 ==================================
-- Run ONLY after the new app.js + supabase.js are live and you can sign in.
-- Locks the report tables: only a signed-in session can read/write them.
/*
drop policy if exists "open access" on public.time_reports;
drop policy if exists "open access" on public.discharge_lists;
drop policy if exists "session only" on public.time_reports;
drop policy if exists "session only" on public.discharge_lists;

create policy "session only" on public.time_reports for all to anon
  using ((select public.is_valid_session())) with check ((select public.is_valid_session()));
create policy "session only" on public.discharge_lists for all to anon
  using ((select public.is_valid_session())) with check ((select public.is_valid_session()));
*/


-- ======================= DAILY ADMIN COMMANDS =========================
-- Run these one at a time in the SQL Editor (edit the values first).
-- Tip: don't save these queries in "Snippets" because they contain passwords.

-- List users
--   select id, username, full_name, role, active, last_login from public.app_users order by id;

-- Add a user
--   insert into public.app_users (username, password_hash, full_name, role)
--   values ('0182', extensions.crypt('NewPass123', extensions.gen_salt('bf')), 'Ali Said', 'user');

-- Change a password
--   update public.app_users set password_hash = extensions.crypt('NewPass456', extensions.gen_salt('bf'))
--   where username = '0181';

-- Disable a user and sign them out now
--   update public.app_users set active = false where username = '0182';
--   delete from public.app_sessions where user_id = (select id from public.app_users where username = '0182');

-- Enable a user again
--   update public.app_users set active = true where username = '0182';

-- Delete a user
--   delete from public.app_users where username = '0182';

-- Sign everybody out
--   delete from public.app_sessions;
