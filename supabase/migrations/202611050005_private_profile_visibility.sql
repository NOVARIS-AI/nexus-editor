-- Allow accepted followers to read private creator profile details.
begin;
drop policy if exists "Public profiles are visible" on public.profiles;
create policy "Public profiles are visible" on public.profiles
for select using (
  is_private = false
  or id = auth.uid()
  or exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid()
      and f.followed_id = profiles.id
      and f.status = 'accepted'
  )
);
commit;
