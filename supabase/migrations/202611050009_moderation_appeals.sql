begin;
create table if not exists public.moderation_appeals (
 id uuid primary key default gen_random_uuid(),
 appellant_id uuid not null references auth.users(id) on delete cascade,
 target_type text not null check (target_type in ('post','comment')),
 target_id uuid not null,
 explanation text not null check (char_length(explanation) between 10 and 2000),
 status text not null default 'open' check (status in ('open','reviewing','upheld','reversed')),
 reviewer_id uuid references auth.users(id) on delete set null,
 reviewer_note text not null default '' check (char_length(reviewer_note)<=1000),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
create index if not exists moderation_appeals_queue_idx on public.moderation_appeals(status,created_at);
alter table public.moderation_appeals enable row level security;
drop policy if exists "Creators can read their own moderation appeals" on public.moderation_appeals;
create policy "Creators can read their own moderation appeals" on public.moderation_appeals for select using(appellant_id=auth.uid());
drop policy if exists "Creators can submit appeals for their own moderated content" on public.moderation_appeals;
create policy "Creators can submit appeals for their own moderated content" on public.moderation_appeals for insert with check(
 appellant_id=auth.uid()
 and not exists(select 1 from public.moderation_appeals a where a.appellant_id=auth.uid() and a.target_type=moderation_appeals.target_type and a.target_id=moderation_appeals.target_id and a.status in ('open','reviewing'))
);
revoke all on public.moderation_appeals from anon,authenticated;
grant select,insert on public.moderation_appeals to authenticated;
commit;
