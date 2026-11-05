-- NEXUS video pipeline metadata and moderation gate.
-- Uploads remain private drafts until a trusted moderation/publishing service approves them.
begin;

alter table public.posts
  add column if not exists moderation_state text not null default 'pending'
    check (moderation_state in ('pending','approved','rejected','review')),
  add column if not exists moderation_checked_at timestamptz,
  add column if not exists moderation_note text not null default '';

alter table public.media_assets
  add column if not exists thumbnail_url text,
  add column if not exists provider_ready_at timestamptz;

create index if not exists posts_moderation_queue_idx
  on public.posts (moderation_state, created_at asc)
  where status = 'draft';

-- Clients cannot approve moderation or publish posts. Only trusted server code can.
create or replace function public.guard_nexus_publish_state()
returns trigger language plpgsql set search_path = public
as $nexus$
declare jwt_role text;
begin
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  if tg_table_name = 'posts' then
    if tg_op = 'INSERT' and new.status <> 'draft' and jwt_role <> 'service_role' then
      raise exception 'Posts must begin as drafts';
    end if;
    if tg_op = 'UPDATE' and jwt_role <> 'service_role' and (
      new.status is distinct from old.status
      or new.moderation_state is distinct from old.moderation_state
      or new.moderation_checked_at is distinct from old.moderation_checked_at
      or new.moderation_note is distinct from old.moderation_note
      or new.published_at is distinct from old.published_at
    ) then
      raise exception 'Only the trusted publishing and moderation service can change publishing state';
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
        or new.provider_ready_at is distinct from old.provider_ready_at
      ) then
        raise exception 'Only the trusted media service can change provider and upload state';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$nexus$;

comment on column public.posts.moderation_state is
  'Trusted moderation gate. New uploads remain pending and are not visible in public feeds until approved and published by server code.';
comment on column public.media_assets.playback_id is
  'Private Cloudflare Stream playback identifier; never expose until the related post is approved and published.';

commit;
