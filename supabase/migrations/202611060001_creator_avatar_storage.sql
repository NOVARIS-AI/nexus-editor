-- NEXUS creator avatar storage
-- Public reads are intentional for profile images. Upload, replace and delete are restricted to the
-- authenticated owner's own user-id folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nexus-avatars', 'nexus-avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "NEXUS avatar images are publicly readable" on storage.objects;
create policy "NEXUS avatar images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'nexus-avatars');

drop policy if exists "Creators upload their own NEXUS avatar" on storage.objects;
create policy "Creators upload their own NEXUS avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'nexus-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Creators update their own NEXUS avatar" on storage.objects;
create policy "Creators update their own NEXUS avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'nexus-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'nexus-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Creators delete their own NEXUS avatar" on storage.objects;
create policy "Creators delete their own NEXUS avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'nexus-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
