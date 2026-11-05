-- NEXUS video publishing safety gate.
-- Existing ready posts remain approved; newly uploaded posts default to pending review.
begin;

alter table public.posts
  add column if not exists moderation_state text not null default 'pending';

alter table public.posts
  drop constraint if exists posts_moderation_state_check;
alter table public.posts
  add constraint posts_moderation_state_check
  check (moderation_state in ('pending','approved','rejected'));

update public.posts
set moderation_state = 'approved'
where status = 'ready' and moderation_state = 'pending';

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
