begin;
-- Moderator assignments are managed only by the Supabase project owner through SQL.
-- No client-facing policies or grants are created for this table.
create table if not exists public.moderator_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator','admin')),
  created_at timestamptz not null default now()
);
alter table public.moderator_roles enable row level security;
revoke all on public.moderator_roles from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.moderation_events from anon, authenticated;
-- Report submission remains available through the existing insert policy.
grant insert on public.reports to authenticated;
commit;
