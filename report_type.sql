-- Report Type (1-ESR, 2-Cargo Discharge, ...) - run once in Supabase SQL Editor
alter table public.time_reports add column if not exists report_type text not null default '';
create index if not exists idx_tr_type on public.time_reports (report_type);
notify pgrst, 'reload schema';
