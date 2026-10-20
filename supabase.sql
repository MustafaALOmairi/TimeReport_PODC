-- Time Report - Supabase (PostgreSQL)
-- Run this once in Supabase: SQL Editor > New query > paste > Run

create table if not exists public.time_reports (
  id          bigint generated always as identity primary key,
  mv          text not null default '',
  voy         text not null default '',
  report_date date not null default current_date,
  shift       text not null default '',
  berth       text not null default '',
  bollard     text not null default '',
  yard_no     text not null default '',
  what_we_do  text not null default '',
  activities  jsonb not null default '[]',   -- [{start_time,end_time,qty,what_we_use}]
  manpower    jsonb not null default '{}',   -- {FOREMAN:[..],TALLYMAN:[..],DOCKER:[..]}
  equipment   jsonb not null default '[]',   -- [{equipment,operator,start_time,end_time}]
  pams_done   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.discharge_lists (
  id         bigint generated always as identity primary key,
  mv         text not null default '',
  voy        text not null default '',
  list_date  date not null default current_date,
  shift      text not null default '',
  berth      text not null default '',
  yard_no    text not null default '',
  remarks    text not null default '',
  items      jsonb not null default '[]',    -- [{item_no,description,qty,unit,location,remarks}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tr_date on public.time_reports (report_date desc);
create index if not exists idx_dl_date on public.discharge_lists (list_date desc);

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_tr_touch on public.time_reports;
create trigger trg_tr_touch before update on public.time_reports
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_dl_touch on public.discharge_lists;
create trigger trg_dl_touch before update on public.discharge_lists
  for each row execute function public.touch_updated_at();

-- Row Level Security.
-- WARNING: these policies let anyone who has the site's public key read/write/delete.
-- Fine for an internal pilot; add Supabase Auth and tighten the policies before real use.
alter table public.time_reports    enable row level security;
alter table public.discharge_lists enable row level security;

drop policy if exists "open access" on public.time_reports;
create policy "open access" on public.time_reports    for all to anon using (true) with check (true);
drop policy if exists "open access" on public.discharge_lists;
create policy "open access" on public.discharge_lists for all to anon using (true) with check (true);
