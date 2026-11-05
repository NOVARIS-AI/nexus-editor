-- NEXUS Saved Videos & Collections.
-- Apply after 202611050002_social_foundation.sql in the dedicated NEXUS Supabase project.
begin;

create table if not exists public.saved_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 48),
  description text not null default '' check (char_length(description) <= 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists saved_collections_owner_name_idx
  on public.saved_collections (owner_id, lower(name));
create index if not exists saved_collections_owner_created_idx
  on public.saved_collections (owner_id, created_at desc);

create table if not exists public.saved_collection_posts (
  collection_id uuid not null references public.saved_collections(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, post_id)
);
create index if not exists saved_collection_posts_post_idx
  on public.saved_collection_posts (post_id, added_at desc);

alter table public.saved_collections enable row level security;
alter table public.saved_collection_posts enable row level security;

drop policy if exists "Creators manage their saved collections" on public.saved_collections;
create policy "Creators manage their saved collections"
  on public.saved_collections for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Creators read their collection items" on public.saved_collection_posts;
create policy "Creators read their collection items"
  on public.saved_collection_posts for select
  using (exists (
    select 1 from public.saved_collections c
    where c.id = collection_id and c.owner_id = auth.uid()
  ));

drop policy if exists "Creators add their saved posts to collections" on public.saved_collection_posts;
create policy "Creators add their saved posts to collections"
  on public.saved_collection_posts for insert
  with check (
    exists (
      select 1 from public.saved_collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.post_saves s
      where s.user_id = auth.uid() and s.post_id = saved_collection_posts.post_id
    )
  );

drop policy if exists "Creators remove items from their collections" on public.saved_collection_posts;
create policy "Creators remove items from their collections"
  on public.saved_collection_posts for delete
  using (exists (
    select 1 from public.saved_collections c
    where c.id = collection_id and c.owner_id = auth.uid()
  ));

create or replace function public.cleanup_nexus_saved_collection_items()\nreturns trigger language plpgsql security definer set search_path = public\nas $nexus$\nbegin\n  delete from public.saved_collection_posts scp\n  using public.saved_collections sc\n  where scp.collection_id = sc.id and sc.owner_id = old.user_id and scp.post_id = old.post_id;\n  return old;\nend;\n$nexus$;\ndrop trigger if exists post_saves_cleanup_collections on public.post_saves;\ncreate trigger post_saves_cleanup_collections after delete on public.post_saves\nfor each row execute function public.cleanup_nexus_saved_collection_items();\n\ndrop trigger if exists saved_collections_set_updated_at on public.saved_collections;
create trigger saved_collections_set_updated_at before update on public.saved_collections
for each row execute function public.set_profile_updated_at();

commit;
