-- NEXUS Pulse 2.0: persistent, user-controlled recommendation preferences and creator topics.
begin;

alter table public.posts
  add column if not exists topics text[] not null default '{}';
alter table public.profiles
  add column if not exists creator_topics text[] not null default '{}';

create index if not exists posts_topics_gin_idx on public.posts using gin (topics);
create index if not exists profiles_creator_topics_gin_idx on public.profiles using gin (creator_topics);

create table if not exists public.feed_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_categories text[] not null default '{}',
  hidden_post_ids uuid[] not null default '{}',
  hidden_creator_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint feed_preferences_categories_count check (cardinality(preferred_categories) <= 20),
  constraint feed_preferences_hidden_posts_count check (cardinality(hidden_post_ids) <= 500),
  constraint feed_preferences_hidden_creators_count check (cardinality(hidden_creator_ids) <= 500)
);

alter table public.feed_preferences enable row level security;
drop policy if exists "Users can read their own feed preferences" on public.feed_preferences;
create policy "Users can read their own feed preferences"
  on public.feed_preferences for select using (user_id = auth.uid());
drop policy if exists "Users can create their own feed preferences" on public.feed_preferences;
create policy "Users can create their own feed preferences"
  on public.feed_preferences for insert with check (user_id = auth.uid());
drop policy if exists "Users can update their own feed preferences" on public.feed_preferences;
create policy "Users can update their own feed preferences"
  on public.feed_preferences for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users can delete their own feed preferences" on public.feed_preferences;
create policy "Users can delete their own feed preferences"
  on public.feed_preferences for delete using (user_id = auth.uid());

create or replace function public.set_nexus_feed_preferences_updated_at()
returns trigger language plpgsql set search_path = public
as $nexus$
begin
  new.updated_at := now();
  return new;
end;
$nexus$;
drop trigger if exists feed_preferences_set_updated_at on public.feed_preferences;
create trigger feed_preferences_set_updated_at
before update on public.feed_preferences
for each row execute function public.set_nexus_feed_preferences_updated_at();

comment on table public.feed_preferences is
  'Private user-controlled NEXUS Pulse preferences. No watch-time or sensitive personal profiling.';
comment on column public.posts.topics is
  'Creator-selected topics used for relevance and discovery.';
comment on column public.profiles.creator_topics is
  'Creator-selected topics used for matching posts to interested viewers.';

commit;
