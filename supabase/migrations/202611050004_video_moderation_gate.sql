-- NEXUS video publishing safety gate.
-- Existing ready posts remain approved; newly uploaded posts default to pending review.
begin;

alter table public.posts
  add column if not exists moderation_state text not null default 'pending';

alter table public.media_assets
  add column if not exists provider_ready_at timestamptz,
  add column if not exists thumbnail_url text;

alter table public.posts
  drop constraint if exists posts_moderation_state_check;
alter table public.posts
  add constraint posts_moderation_state_check
  check (moderation_state in ('pending','approved','rejected'));

update public.posts
set moderation_state = 'approved'
where status = 'ready' and moderation_state = 'pending';

-- Moderation decisions, like publish-state changes, are trusted-server only.
create or replace function public.guard_nexus_publish_state()
returns trigger language plpgsql set search_path = public
as $nexus$
declare jwt_role text;
begin
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  if tg_table_name = 'posts' then
    if jwt_role <> 'service_role' then
      if tg_op = 'INSERT' and (new.status <> 'draft' or new.moderation_state <> 'pending') then
        raise exception 'Posts must begin as unapproved drafts';
      end if;
      if tg_op = 'UPDATE' and (
        new.status is distinct from old.status
        or new.moderation_state is distinct from old.moderation_state
      ) then
        raise exception 'Only the trusted publishing service can change publish or moderation state';
      end if;
    end if;
  elsif tg_table_name = 'media_assets' then
    if jwt_role <> 'service_role' then
      if tg_op = 'INSERT' and (new.upload_state <> 'pending' or new.provider <> 'unconfigured' or new.provider_asset_id is not null or new.playback_id is not null) then
        raise exception 'Media assets must begin as unconfigured pending records';
      end if;
      if tg_op = 'UPDATE' and (
        new.upload_state is distinct from old.upload_state
        or new.provider is distinct from old.provider
        or new.provider_asset_id is distinct from old.provider_asset_id
        or new.playback_id is distinct from old.playback_id
      ) then
        raise exception 'Only the trusted media service can change provider and upload state';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$nexus$;

create index if not exists posts_moderation_feed_idx
  on public.posts (moderation_state, visibility, published_at desc)
  where status = 'ready';

drop policy if exists "Creators and eligible viewers can read posts" on public.posts;
create policy "Creators and eligible viewers can read posts" on public.posts for select
using (
  author_id = auth.uid()
  or (
    status = 'ready'
    and moderation_state = 'approved'
    and not public.is_nexus_blocked(auth.uid(), author_id)
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

comment on column public.posts.moderation_state is
  'Server-controlled safety gate. Only approved posts can be shown to other viewers.';

commit;
