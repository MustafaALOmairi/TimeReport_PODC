-- Run once in Supabase > SQL Editor (adds name / signature / creator to time reports)
alter table public.time_reports add column if not exists sign_name text not null default '';
alter table public.time_reports add column if not exists signature text not null default '';
alter table public.time_reports add column if not exists created_by text not null default '';
alter table public.time_reports add column if not exists created_by_user text not null default '';
notify pgrst, 'reload schema';
