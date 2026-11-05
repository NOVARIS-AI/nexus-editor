-- NEXUS Editor: creator profile foundation
-- Apply only in the dedicated NEXUS Supabase project.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'NEXUS Creator',
  avatar_url text,
  bio text not null default '',
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]{3,24}$')
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are visible" on public.profiles;
create policy "Public profiles are visible" on public.profiles
for select using (is_private = false or id = auth.uid());

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles
for insert with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.set_profile_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_profile_updated_at();

create or replace function public.handle_new_nexus_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'NEXUS Creator'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_nexus_auth_user_created on auth.users;
create trigger on_nexus_auth_user_created after insert on auth.users
for each row execute function public.handle_new_nexus_user();
