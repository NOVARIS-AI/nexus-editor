# NEXUS Public Platform — Provider Readiness

Status: **Dedicated NEXUS Supabase project confirmed by the owner; profile foundation applied; social schema committed and awaiting execution.**
Date: 2026-11-05

## Confirmed NEXUS Supabase setup

The owner confirmed that the Supabase project displayed with the mistaken project name **“Aurora voice text” is actually the newly created, dedicated NEXUS project**. Treat it as NEXUS-only. Do not connect it to the separate AURORA VoiceText product or reuse AURORA VoiceText credentials.

The owner has:
- Saved the project URL and publishable/anon key privately.
- Created a starter table named `Nexus editor`. Preserve it; this migration does not alter or remove it.
- Applied `supabase/migrations/202611050001_profiles.sql` successfully.
- Confirmed `public.profiles`, its RLS policies, profile timestamp trigger and new-user profile trigger are present.

The profile foundation uses `auth.users(id)` as the profile primary/foreign key, unique optional usernames, display name, avatar URL, bio and private-profile setting. RLS permits public profile reads only for non-private profiles and owner access for private profiles.

## Repository integration audit

- Frontend: React + TypeScript + Vite.
- Supabase JS client is declared in the app dependencies.
- `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (falling back to `VITE_SUPABASE_ANON_KEY`).
- `src/lib/AuthGate.tsx` contains the auth/guest gate and email/password plus configured Google/Apple OAuth entry points.
- The browser must receive only the project URL and publishable/anon key. Never put the Supabase secret/service-role key in frontend code, GitHub, Vite variables or a public environment file.
- Existing Cloudflare Worker is for AI text/image generation. It is not a video host.

## Social database foundation committed

Migration: `supabase/migrations/202611050002_social_foundation.sql`

It adds:
- `follows` with pending requests for private accounts and approval by the followed creator.
- `blocks` with private block-list visibility.
- `media_assets` for private provider metadata; client-created rows start unconfigured and pending.
- `posts` with draft-first status, public/followers/private visibility and publish metadata.
- `post_likes`, `post_saves` and `comments`.
- `reports` and a restricted `moderation_events` audit table.
- Indexes, constraints, RLS policies and trusted-service-only guards for publish/upload state.

**Important:** this migration has been committed to GitHub but has not yet been run in Supabase. It deliberately does not configure Cloudflare Stream, create public playable videos, or enable publishing. The owner should run it once, after the profile migration, in the confirmed dedicated NEXUS project.

The starter `Nexus editor` table and existing profile migration are preserved.

## Cloudflare Stream remains unverified

No Stream entitlement, pricing/quotas, API token, webhook secret or upload limits have been confirmed. Do not treat the AI Worker credentials as Stream credentials. Before enabling uploads:
1. Confirm Stream is available on the intended account and review current costs/quotas.
2. Agree safe upload size/duration limits.
3. Use a narrowly scoped server-side token and signed webhook verification.
4. Keep secrets server-side and use direct, short-lived upload URLs.
5. Do not activate paid billing without explicit approval.

## Next sequence

1. Owner runs the new social migration and confirms success.
2. Verify tables and RLS policies exist in Supabase.
3. Add typed social data access and server-side authorization tests.
4. Build server-backed profile/follow/like/save/comment flows.
5. Select and configure an approved video provider before upload/publish integration.
6. Complete moderation, privacy, child-safety and abuse controls before public uploads.

No deployment is part of this work. GitHub remains the implementation source of truth until testing and explicit release approval.
