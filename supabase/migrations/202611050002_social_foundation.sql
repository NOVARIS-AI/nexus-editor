-- NEXUS social foundation: follows, posts, media metadata, interactions and safety.
-- Apply after 202611050001_profiles.sql in the dedicated NEXUS Supabase project.
-- This migration does NOT configure a video provider or enable public publishing.
begin;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_no_self check (follower_id <> followed_id)
);
create index if not exists follows_followed_status_idx on public.follows (followed_id, status, created_at desc);
create index if not exists follows_follower_status_idx on public.follows (follower_id, status, created_at desc);

-- Public accounts can be followed immediately. Private accounts receive a pending request.
create or replace function public.enforce_nexus_follow_status()
returns trigger language plpgsql security definer set search_path = public
as $$
declare target_is_private boolean;
begin
  select is_private into target_is_private from public.profiles where id = new.followed_id;
  if target_is_private is null then
    raise exception 'The target creator does not exist';
  end if;
  if tg_op = 'INSERT' then
    new.status := case when target_is_private then 'pending' else 'accepted' end;
  elsif old.status = 'pending' and new.status = 'accepted' then
    if new.followed_id <> auth.uid() then
      raise exception 'Only the requested creator can approve a follow request';
    end if;
  elsif new.status <> old.status then
    raise exception 'Follow status can only be changed by approving a pending request';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists follows_enforce_status on public.follows;
create trigger follows_enforce_status before insert or update on public.follows
for each row execute function public.enforce_nexus_follow_status();

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id, blocker_id);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'unconfigured',
  provider_asset_id text,
  playback_id text,
  upload_state text not null default 'pending'
    check (upload_state in ('pending','uploading','processing','ready','failed','blocked','removed')),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_assets_owner_created_idx on public.media_assets (owner_id, created_at desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 2200),
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  status text not null default 'draft'
    check (status in ('draft','uploading','processing','ready','blocked','removed','failed')),
  media_asset_id uuid references public.media_assets(id) on delete set null,
  source_project_id text,
  comments_enabled boolean not null default true,
  remix_enabled boolean not null default false,
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_public_feed_idx on public.posts (published_at desc, id desc)
  where status = 'ready' and visibility = 'public';
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_media_asset_idx on public.posts (media_asset_id);

-- Only trusted service-role code may move an asset or post into a publishable state.
create or replace function public.guard_nexus_publish_state()
returns trigger language plpgsql set search_path = public
as $$
declare jwt_role text;
begin
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  if tg_table_name = 'posts' then
    if tg_op = 'INSERT' and new.status <> 'draft' and jwt_role <> 'service_role' then
      raise exception 'Posts must begin as drafts';
    end if;
    if tg_op = 'UPDATE' and new.status is distinct from old.status and jwt_role <> 'service_role' then
      raise exception 'Only the trusted publishing service can change post status';
    end if;
  elsif tg_table_name = 'media_assets' then
    if tg_op = 'INSERT' and new.upload_state <> 'pending' and jwt_role <> 'service_role' then
      raise exception 'Media assets must begin as pending';
    end if;
    if tg_op = 'UPDATE' and new.upload_state is distinct from old.upload_state and jwt_role <> 'service_role' then
      raise exception 'Only the trusted media service can change upload state';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists posts_guard_publish_state on public.posts;
create trigger posts_guard_publish_state before insert or update on public.posts
for each row execute function public.guard_nexus_publish_state();
drop trigger if exists media_assets_guard_upload_state on public.media_assets;
create trigger media_assets_guard_upload_state before insert or update on public.media_assets
for each row execute function public.guard_nexus_publish_state();

create table if not exists public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id, created_at desc);

create table if not exists public.post_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists post_saves_user_idx on public.post_saves (user_id, created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc);
create index if not exists comments_author_created_idx on public.comments (author_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','profile')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','harassment','hate','sexual_content','violence','self_harm','copyright','misinformation','other')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists reports_queue_idx on public.reports (status, created_at asc);

-- Restricted audit log: no client-facing policies are intentionally provided.
create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Updated-at triggers reuse the function created by the profiles migration.
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_profile_updated_at();
drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments
for each row execute function public.set_profile_updated_at();

alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_events enable row level security;

-- Follow graph: users can see accepted edges; request recipient can see pending requests.
drop policy if exists "Accepted follows are visible" on public.follows;
create policy "Accepted follows are visible" on public.follows for select
using (status = 'accepted' or follower_id = auth.uid() or followed_id = auth.uid());
drop policy if exists "Users can request follows" on public.follows;
create policy "Users can request follows" on public.follows for insert
with check (follower_id = auth.uid() and followed_id <> auth.uid());
drop policy if exists "Creators can approve follow requests" on public.follows;
create policy "Creators can approve follow requests" on public.follows for update
using (followed_id = auth.uid() and status = 'pending')
with check (followed_id = auth.uid() and status = 'accepted');
drop policy if exists "Users can cancel follows" on public.follows;
create policy "Users can cancel follows" on public.follows for delete
using (follower_id = auth.uid() or followed_id = auth.uid());

drop policy if exists "Users can see their own blocks" on public.blocks;
create policy "Users can see their own blocks" on public.blocks for select
using (blocker_id = auth.uid());
drop policy if exists "Users can create their own blocks" on public.blocks;
create policy "Users can create their own blocks" on public.blocks for insert
with check (blocker_id = auth.uid() and blocked_id <> auth.uid());
drop policy if exists "Users can remove their own blocks" on public.blocks;
create policy "Users can remove their own blocks" on public.blocks for delete
using (blocker_id = auth.uid());

-- Media metadata is private to its owner until a trusted service publishes a post.
drop policy if exists "Owners can read media metadata" on public.media_assets;
create policy "Owners can read media metadata" on public.media_assets for select
using (owner_id = auth.uid());
drop policy if exists "Owners can create pending media metadata" on public.media_assets;
create policy "Owners can create pending media metadata" on public.media_assets for insert
with check (owner_id = auth.uid() and upload_state = 'pending');
drop policy if exists "Owners can update their media metadata" on public.media_assets;
create policy "Owners can update their media metadata" on public.media_assets for update
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners can delete pending media metadata" on public.media_assets;
create policy "Owners can delete pending media metadata" on public.media_assets for delete
using (owner_id = auth.uid() and upload_state in ('pending','failed'));

-- Post visibility is checked in the database, including follower-only/private and blocks.
drop policy if exists "Creators and eligible viewers can read posts" on public.posts;
create policy "Creators and eligible viewers can read posts" on public.posts for select
using (
  author_id = auth.uid()
  or (
    status = 'ready'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
         or (b.blocker_id = author_id and b.blocked_id = auth.uid())
    )
    and (
      (visibility = 'public' and exists (
        select 1 from public.profiles p where p.id = author_id and p.is_private = false
      ))
      or (visibility = 'followers' and exists (
        select 1 from public.follows f where f.follower_id = auth.uid()
          and f.followed_id = author_id and f.status = 'accepted'
      ))
    )
  )
);
drop policy if exists "Creators can create drafts" on public.posts;
create policy "Creators can create drafts" on public.posts for insert
with check (author_id = auth.uid() and status = 'draft');
drop policy if exists "Creators can edit their own drafts" on public.posts;
create policy "Creators can edit their own drafts" on public.posts for update
using (author_id = auth.uid() and status = 'draft')
with check (author_id = auth.uid() and status = 'draft');
drop policy if exists "Creators can delete their own drafts" on public.posts;
create policy "Creators can delete their own drafts" on public.posts for delete
using (author_id = auth.uid() and status in ('draft','failed'));

-- Interaction rows inherit post visibility and are always owned by the acting account.
drop policy if exists "Visible post likes can be read" on public.post_likes;
create policy "Visible post likes can be read" on public.post_likes for select
using (exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists "Users can like visible posts" on public.post_likes;
create policy "Users can like visible posts" on public.post_likes for insert
with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.status = 'ready'));
drop policy if exists "Users can unlike their posts" on public.post_likes;
create policy "Users can unlike their posts" on public.post_likes for delete
using (user_id = auth.uid());

drop policy if exists "Users can read their own saves" on public.post_saves;
create policy "Users can read their own saves" on public.post_saves for select
using (user_id = auth.uid());
drop policy if exists "Users can save visible posts" on public.post_saves;
create policy "Users can save visible posts" on public.post_saves for insert
with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.status = 'ready'));
drop policy if exists "Users can remove their own saves" on public.post_saves;
create policy "Users can remove their own saves" on public.post_saves for delete
using (user_id = auth.uid());

drop policy if exists "Visible comments can be read" on public.comments;
create policy "Visible comments can be read" on public.comments for select
using (status = 'visible' and exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists "Users can comment on eligible posts" on public.comments;
create policy "Users can comment on eligible posts" on public.comments for insert
with check (
  author_id = auth.uid() and status = 'visible'
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'ready' and p.comments_enabled)
);
drop policy if exists "Authors can edit their own comments" on public.comments;
create policy "Authors can edit their own comments" on public.comments for update
using (author_id = auth.uid() and status = 'visible')
with check (author_id = auth.uid() and status = 'visible');
drop policy if exists "Authors can delete their own comments" on public.comments;
create policy "Authors can delete their own comments" on public.comments for delete
using (author_id = auth.uid());

-- Reports are private to their reporter on read; only the reporter may submit.
drop policy if exists "Reporters can read their reports" on public.reports;
create policy "Reporters can read their reports" on public.reports for select
using (reporter_id = auth.uid());
drop policy if exists "Signed-in users can submit reports" on public.reports;
create policy "Signed-in users can submit reports" on public.reports for insert
with check (reporter_id = auth.uid() and status = 'open');

-- moderation_events intentionally has RLS enabled and no anon/authenticated policies.
commit;
