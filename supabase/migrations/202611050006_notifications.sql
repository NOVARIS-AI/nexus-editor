-- NEXUS in-app notifications: follow requests, new followers, likes and comments.
begin;
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('follow_request','new_follower','follow_accepted','post_like','post_comment')),
  entity_type text check (entity_type in ('profile','post','comment')),
  entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_id,created_at desc) where read_at is null;
alter table public.notifications enable row level security;
drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications" on public.notifications for select using (recipient_id = auth.uid());
create or replace function public.mark_nexus_notification_read(p_notification_id uuid default null) returns void language plpgsql security definer set search_path=public as $nexus$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_notification_id is null then update public.notifications set read_at=now() where recipient_id=auth.uid() and read_at is null;
  else update public.notifications set read_at=now() where id=p_notification_id and recipient_id=auth.uid() and read_at is null; end if;
end;
$nexus$;
revoke all on function public.mark_nexus_notification_read(uuid) from public;
grant execute on function public.mark_nexus_notification_read(uuid) to authenticated;
create or replace function public.create_nexus_notification(p_recipient uuid,p_actor uuid,p_type text,p_entity_type text,p_entity uuid) returns void language plpgsql security definer set search_path=public as $nexus$
begin
  if p_recipient is null or p_actor is null or p_recipient=p_actor then return; end if;
  insert into public.notifications(recipient_id,actor_id,event_type,entity_type,entity_id) values(p_recipient,p_actor,p_type,p_entity_type,p_entity);
end;
$nexus$;
revoke all on function public.create_nexus_notification(uuid,uuid,text,text,uuid) from public;
create or replace function public.notify_nexus_follow_insert() returns trigger language plpgsql security definer set search_path=public as $nexus$
begin
  if new.status='pending' then perform public.create_nexus_notification(new.followed_id,new.follower_id,'follow_request','profile',new.follower_id);
  elsif new.status='accepted' then perform public.create_nexus_notification(new.followed_id,new.follower_id,'new_follower','profile',new.follower_id); end if;
  return new;
end;
$nexus$;
drop trigger if exists follows_notify_insert on public.follows;
create trigger follows_notify_insert after insert on public.follows for each row execute function public.notify_nexus_follow_insert();
create or replace function public.notify_nexus_follow_update() returns trigger language plpgsql security definer set search_path=public as $nexus$
begin
  if old.status='pending' and new.status='accepted' then perform public.create_nexus_notification(new.follower_id,new.followed_id,'follow_accepted','profile',new.followed_id); end if;
  return new;
end;
$nexus$;
drop trigger if exists follows_notify_update on public.follows;
create trigger follows_notify_update after update of status on public.follows for each row execute function public.notify_nexus_follow_update();
create or replace function public.notify_nexus_post_like() returns trigger language plpgsql security definer set search_path=public as $nexus$
declare post_owner uuid;
begin select author_id into post_owner from public.posts where id=new.post_id; perform public.create_nexus_notification(post_owner,new.user_id,'post_like','post',new.post_id); return new; end;
$nexus$;
drop trigger if exists post_likes_notify_insert on public.post_likes;
create trigger post_likes_notify_insert after insert on public.post_likes for each row execute function public.notify_nexus_post_like();
create or replace function public.notify_nexus_post_comment() returns trigger language plpgsql security definer set search_path=public as $nexus$
declare post_owner uuid;
begin select author_id into post_owner from public.posts where id=new.post_id; perform public.create_nexus_notification(post_owner,new.author_id,'post_comment','comment',new.id); return new; end;
$nexus$;
drop trigger if exists comments_notify_insert on public.comments;
create trigger comments_notify_insert after insert on public.comments for each row execute function public.notify_nexus_post_comment();
commit;