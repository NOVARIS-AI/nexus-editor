-- Complete the trusted publishing path: uploaded videos enter review and only
-- an authorized moderator can atomically approve or reject them.
begin;
create or replace function public.nexus_review_pending_post(
  p_post_id uuid, p_actor_id uuid, p_decision text, p_note text default ''
)
returns jsonb language plpgsql security definer set search_path = public
as $nexus$
declare
  v_post public.posts%rowtype;
  v_asset public.media_assets%rowtype;
  v_role text;
  v_next_status text;
  v_next_moderation text;
  v_next_upload text;
begin
  select role into v_role from public.moderator_roles where user_id = p_actor_id;
  if coalesce(v_role,'') not in ('moderator','admin') then raise exception 'Moderator permission required'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Invalid publishing review decision'; end if;

  select * into v_post from public.posts where id = p_post_id for update;
  if not found then raise exception 'Pending post not found'; end if;
  if v_post.status <> 'processing' or v_post.moderation_state <> 'pending' then
    raise exception 'This post is not awaiting moderation review';
  end if;
  if v_post.media_asset_id is null then raise exception 'This post has no uploaded video'; end if;

  select * into v_asset from public.media_assets
  where id = v_post.media_asset_id and owner_id = v_post.author_id for update;
  if not found then raise exception 'Uploaded media record was not found'; end if;
  if v_asset.upload_state <> 'ready' then raise exception 'Video processing must finish before moderation review'; end if;

  if p_decision = 'approve' then
    v_next_status := 'ready'; v_next_moderation := 'approved'; v_next_upload := 'ready';
  else
    v_next_status := 'blocked'; v_next_moderation := 'rejected'; v_next_upload := 'blocked';
  end if;

  update public.posts
  set status = v_next_status, moderation_state = v_next_moderation,
      published_at = case when p_decision = 'approve' then coalesce(published_at, now()) else published_at end,
      updated_at = now()
  where id = v_post.id;
  update public.media_assets set upload_state = v_next_upload, updated_at = now() where id = v_asset.id;

  insert into public.moderation_events(actor_id,target_type,target_id,action,reason,metadata)
  values(p_actor_id,'post',v_post.id,
    case when p_decision = 'approve' then 'publish_approved' else 'publish_rejected' end,
    left(coalesce(p_note,''),1000),
    jsonb_build_object('visibility',v_post.visibility,'media_asset_id',v_asset.id));

  return jsonb_build_object('ok',true,'post_id',v_post.id,'decision',p_decision,
    'status',v_next_status,'moderation_state',v_next_moderation);
end;
$nexus$;
revoke all on function public.nexus_review_pending_post(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.nexus_review_pending_post(uuid,uuid,text,text) to service_role;
commit;
