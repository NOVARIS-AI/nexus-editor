-- Atomic moderation actions: content state, report/appeal state and audit event
-- are committed together. Only trusted server code may execute these functions.
begin;

create or replace function public.nexus_apply_report_decision(
  p_report_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $nexus$
declare
  v_report public.reports%rowtype;
  v_post public.posts%rowtype;
  v_role text;
  v_action text;
begin
  select role into v_role from public.moderator_roles where user_id = p_actor_id;
  if v_role not in ('moderator','admin') then
    raise exception 'Moderator permission required';
  end if;
  if p_decision not in ('remove_content','dismiss') then
    raise exception 'Invalid report decision';
  end if;

  select * into v_report from public.reports
  where id = p_report_id for update;
  if not found then raise exception 'Report not found'; end if;
  if v_report.status not in ('open','reviewing') then
    raise exception 'This report has already been reviewed';
  end if;

  if p_decision = 'remove_content' then
    if v_report.target_type = 'post' then
      select * into v_post from public.posts
      where id = v_report.target_id for update;
      if not found then raise exception 'Reported post no longer exists'; end if;
      update public.posts
      set status = 'blocked', moderation_state = 'rejected', updated_at = now()
      where id = v_post.id;
      if v_post.media_asset_id is not null then
        update public.media_assets
        set upload_state = 'blocked', updated_at = now()
        where id = v_post.media_asset_id;
      end if;
    elsif v_report.target_type = 'comment' then
      update public.comments set status = 'hidden', updated_at = now()
      where id = v_report.target_id;
      if not found then raise exception 'Reported comment no longer exists'; end if;
    else
      raise exception 'Profile-level restrictions require a separate account review process';
    end if;
    v_action := 'remove_content';
    update public.reports set status = 'actioned' where id = p_report_id;
  else
    v_action := 'dismiss';
    update public.reports set status = 'dismissed' where id = p_report_id;
  end if;

  insert into public.moderation_events(actor_id,target_type,target_id,action,reason,metadata)
  values(p_actor_id,v_report.target_type,v_report.target_id,v_action,left(coalesce(p_note,''),1000),
    jsonb_build_object('report_id',p_report_id));
  return jsonb_build_object('ok',true,'decision',p_decision);
end;
$nexus$;

create or replace function public.nexus_decide_moderation_appeal(
  p_appeal_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $nexus$
declare
  v_appeal public.moderation_appeals%rowtype;
  v_post public.posts%rowtype;
  v_role text;
begin
  select role into v_role from public.moderator_roles where user_id = p_actor_id;
  if v_role not in ('moderator','admin') then
    raise exception 'Moderator permission required';
  end if;
  if p_decision not in ('upheld','reversed') then
    raise exception 'Invalid appeal decision';
  end if;

  select * into v_appeal from public.moderation_appeals
  where id = p_appeal_id for update;
  if not found then raise exception 'Appeal not found'; end if;
  if v_appeal.status not in ('open','reviewing') then
    raise exception 'This appeal has already been decided';
  end if;

  if p_decision = 'reversed' then
    if v_appeal.target_type = 'post' then
      select * into v_post from public.posts
      where id = v_appeal.target_id and author_id = v_appeal.appellant_id for update;
      if not found then raise exception 'Appealed post no longer exists or is not owned by the creator'; end if;
      if v_post.media_asset_id is null then raise exception 'The post has no media asset to restore'; end if;
      update public.posts
      set status = 'ready', moderation_state = 'approved', updated_at = now()
      where id = v_post.id;
      update public.media_assets
      set upload_state = 'ready', updated_at = now()
      where id = v_post.media_asset_id and owner_id = v_appeal.appellant_id;
      if not found then raise exception 'The media asset could not be restored'; end if;
    else
      update public.comments set status = 'visible', updated_at = now()
      where id = v_appeal.target_id and author_id = v_appeal.appellant_id;
      if not found then raise exception 'Appealed comment no longer exists or is not owned by the creator'; end if;
    end if;
  end if;

  update public.moderation_appeals
  set status = p_decision, reviewer_id = p_actor_id,
      reviewer_note = left(coalesce(p_note,''),1000), reviewed_at = now()
  where id = p_appeal_id;

  insert into public.moderation_events(actor_id,target_type,target_id,action,reason,metadata)
  values(p_actor_id,v_appeal.target_type,v_appeal.target_id,'appeal_'||p_decision,
    left(coalesce(p_note,''),1000),jsonb_build_object('appeal_id',p_appeal_id));
  return jsonb_build_object('ok',true,'status',p_decision);
end;
$nexus$;

revoke all on function public.nexus_apply_report_decision(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.nexus_decide_moderation_appeal(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.nexus_apply_report_decision(uuid,uuid,text,text) to service_role;
grant execute on function public.nexus_decide_moderation_appeal(uuid,uuid,text,text) to service_role;

commit;
