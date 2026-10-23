-- ======================================================================
-- Time Report - per-user permissions
-- Run order:  users.sql (Part 1)  ->  admin.sql  ->  THIS FILE (Part A)  ->  deploy both sites
--             ->  Part B at the very end (it locks the report tables).
-- Permissions: new_report, new_discharge, search, edit, pams, delete, export
-- Admins always have everything. Normal users start with everything except "delete".
-- ======================================================================

-- ============================ PART A (safe, run now) ==================
alter table public.app_users add column if not exists perms jsonb not null default '{}'::jsonb;

-- effective permissions of a user row
create or replace function public._eff_perms(u public.app_users) returns jsonb
language sql immutable set search_path = public as $$
  select case when u.role = 'admin'
    then '{"new_report":true,"new_discharge":true,"search":true,"edit":true,"pams":true,"delete":true,"export":true}'::jsonb
    else '{"new_report":true,"new_discharge":true,"search":true,"edit":true,"pams":true,"delete":false,"export":true}'::jsonb
         || coalesce(u.perms, '{}'::jsonb)
  end;
$$;
revoke all on function public._eff_perms(public.app_users) from public, anon, authenticated;

-- can the caller (identified by the session token) do X ?
create or replace function public.has_perm(p text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare m public.app_users;
begin
  m := public._me();
  if m.id is null then return false; end if;
  return coalesce((public._eff_perms(m) ->> p)::boolean, false);
end $$;
grant execute on function public.has_perm(text) to anon;

-- login now also returns the permissions
create or replace function public.login(p_user text, p_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users; t uuid;
begin
  select * into u from public.app_users where username = trim(p_user) and active;
  if not found or u.password_hash <> crypt(p_pass, u.password_hash) then
    perform pg_sleep(1);
    return json_build_object('ok', false);
  end if;
  delete from public.app_sessions where expires_at < now();
  insert into public.app_sessions (user_id) values (u.id) returning token into t;
  update public.app_users set last_login = now() where id = u.id;
  return json_build_object('ok', true, 'token', t,
         'name', coalesce(nullif(u.full_name, ''), u.username), 'role', u.role,
         'perms', public._eff_perms(u));
end $$;

create or replace function public.whoami() returns json
language plpgsql stable security definer set search_path = public as $$
declare m public.app_users;
begin
  m := public._me();
  if m.id is null then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'id', m.id, 'username', m.username,
         'name', coalesce(nullif(m.full_name, ''), m.username), 'role', m.role,
         'perms', public._eff_perms(m));
end $$;

create or replace function public.admin_list_users() returns json
language plpgsql stable security definer set search_path = public as $$
declare m public.app_users;
begin
  m := public._me();
  if m.id is null or m.role <> 'admin' then raise exception 'Admins only'; end if;
  return (select coalesce(json_agg(json_build_object(
            'id', u.id, 'username', u.username, 'full_name', u.full_name, 'role', u.role,
            'active', u.active, 'last_login', u.last_login, 'created_at', u.created_at,
            'perms', public._eff_perms(u)) order by u.id), '[]'::json)
          from public.app_users u);
end $$;

-- create / update a user (p_perms null on update = keep the current permissions)
drop function if exists public.admin_save_user(bigint, text, text, text, text, boolean);
create or replace function public.admin_save_user(
  p_id bigint, p_username text, p_pass text, p_name text, p_role text, p_active boolean,
  p_perms jsonb default null) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare m public.app_users; other_admins int; new_id bigint; tok text; clean jsonb;
begin
  m := public._me();
  if m.id is null or m.role <> 'admin' then raise exception 'Admins only'; end if;
  tok := coalesce(current_setting('request.headers', true)::json ->> 'x-client-info', '');
  p_username := trim(coalesce(p_username, ''));
  if p_role not in ('admin', 'user') then raise exception 'Invalid role'; end if;

  if p_perms is not null then   -- keep only known keys with true/false values
    select coalesce(jsonb_object_agg(k, p_perms -> k), '{}'::jsonb) into clean
    from unnest(array['new_report','new_discharge','search','edit','pams','delete','export']) k
    where jsonb_typeof(p_perms -> k) = 'boolean';
  end if;

  if p_id is null then
    if p_username = '' then raise exception 'Username is required'; end if;
    if coalesce(p_pass, '') = '' then raise exception 'Password is required'; end if;
    if length(p_pass) < 4 then raise exception 'Password is too short (minimum 4 characters)'; end if;
    insert into public.app_users (username, password_hash, full_name, role, active, perms)
    values (p_username, crypt(p_pass, gen_salt('bf')), coalesce(p_name, ''), p_role,
            coalesce(p_active, true), coalesce(clean, '{}'::jsonb))
    returning id into new_id;
    return json_build_object('ok', true, 'id', new_id);
  end if;

  if p_role <> 'admin' or not coalesce(p_active, true) then
    select count(*) into other_admins from public.app_users where role = 'admin' and active and id <> p_id;
    if other_admins = 0 and exists (select 1 from public.app_users where id = p_id and role = 'admin' and active) then
      raise exception 'At least one active admin is required';
    end if;
  end if;
  if coalesce(p_pass, '') <> '' and length(p_pass) < 4 then
    raise exception 'Password is too short (minimum 4 characters)';
  end if;

  update public.app_users set
    username      = case when p_username <> '' then p_username else username end,
    full_name     = coalesce(p_name, full_name),
    role          = p_role,
    active        = coalesce(p_active, active),
    perms         = coalesce(clean, perms),
    password_hash = case when coalesce(p_pass, '') <> '' then crypt(p_pass, gen_salt('bf')) else password_hash end
  where id = p_id;
  if not found then raise exception 'User not found'; end if;

  if not coalesce(p_active, true) or coalesce(p_pass, '') <> '' then
    delete from public.app_sessions where user_id = p_id and token::text <> tok;
  end if;
  return json_build_object('ok', true, 'id', p_id);
exception when unique_violation then
  raise exception 'This username already exists';
end $$;
grant execute on function public.admin_save_user(bigint, text, text, text, text, boolean, jsonb) to anon;

-- make sure the website sees the new/changed functions
notify pgrst, 'reload schema';


-- ============================ PART B (run LAST) =======================
-- Run only after BOTH websites are updated and you can sign in.
-- It makes the database itself enforce the permissions (hiding buttons is not enough):
--   read  : any signed-in user          insert : new_report / new_discharge
--   edit  : edit                        pams   : pams
--   delete: delete
-- Remove the /* and */ lines around it, then Run.
/*
drop policy if exists "open access"  on public.time_reports;
drop policy if exists "open access"  on public.discharge_lists;
drop policy if exists "session only" on public.time_reports;
drop policy if exists "session only" on public.discharge_lists;
drop policy if exists "p_select" on public.time_reports;   drop policy if exists "p_select" on public.discharge_lists;
drop policy if exists "p_insert" on public.time_reports;   drop policy if exists "p_insert" on public.discharge_lists;
drop policy if exists "p_update" on public.time_reports;   drop policy if exists "p_update" on public.discharge_lists;
drop policy if exists "p_delete" on public.time_reports;   drop policy if exists "p_delete" on public.discharge_lists;

create policy "p_select" on public.time_reports for select to anon using ((select public.is_valid_session()));
create policy "p_insert" on public.time_reports for insert to anon with check ((select public.has_perm('new_report')));
create policy "p_update" on public.time_reports for update to anon
  using ((select public.has_perm('edit') or public.has_perm('pams')))
  with check ((select public.has_perm('edit') or public.has_perm('pams')));
create policy "p_delete" on public.time_reports for delete to anon using ((select public.has_perm('delete')));

create policy "p_select" on public.discharge_lists for select to anon using ((select public.is_valid_session()));
create policy "p_insert" on public.discharge_lists for insert to anon with check ((select public.has_perm('new_discharge')));
create policy "p_update" on public.discharge_lists for update to anon
  using ((select public.has_perm('edit'))) with check ((select public.has_perm('edit')));
create policy "p_delete" on public.discharge_lists for delete to anon using ((select public.has_perm('delete')));

-- a user with only "pams" may change nothing but the PAMS flag
create or replace function public.enforce_tr_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('request.headers', true), '') = '' then return new; end if;  -- SQL Editor / dashboard
  if (to_jsonb(new) - 'pams_done' - 'updated_at') is distinct from (to_jsonb(old) - 'pams_done' - 'updated_at') then
    if not public.has_perm('edit') then raise exception 'You do not have permission to edit reports'; end if;
  end if;
  if new.pams_done is distinct from old.pams_done then
    if not public.has_perm('pams') then raise exception 'You do not have permission to change PAMS status'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_tr_perm on public.time_reports;
create trigger trg_tr_perm before update on public.time_reports
  for each row execute function public.enforce_tr_update();
*/
