# Supabase setup for NEXUS Editor

## Client environment

Set these values in local `.env.local` and in hosting environment settings only when deployment is approved:

- `VITE_SUPABASE_URL`: dedicated NEXUS Supabase Project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the project's publishable key. The legacy anon key is also accepted as `VITE_SUPABASE_ANON_KEY`.

Only the URL and publishable/anon key belong in browser code. Never put a Supabase secret key, service-role key, database password, or privileged credential in a `VITE_` variable or frontend file. Do not commit `.env.local`.

## Authentication

The authentication screen supports email/password sign-up, sign-in, password reset, Google OAuth and Apple OAuth entry points. Google and Apple must be configured under Supabase Authentication → Providers, with provider credentials and callback URLs. Set the Supabase Site URL and allowed redirect URLs to include local development and production origins before OAuth testing.

Guest browsing remains available. Account-only actions such as publishing, following, liking, commenting and saving will be enforced by the social API and database policies as those features are implemented.

ChatGPT is not a standard Supabase OAuth provider. Do not treat an OpenAI API key or ChatGPT subscription as ChatGPT identity login. A genuine OpenAI identity integration requires a separately supported authorization product and explicit approval.

## Database migration

Run `supabase/migrations/202611050001_profiles.sql` in the dedicated NEXUS project's SQL Editor. It creates the creator profile table, user-creation trigger and row-level security policies. It does not alter the existing `public."Nexus editor"` table.

This is only the profile foundation. Posts, video metadata, follows, likes, saves, comments, moderation and feed ranking are subsequent migrations.

## Verification

After adding environment values, run `npm install`, `npm run build`, then test sign-up, sign-in, password reset and configured OAuth locally. No deployment is part of this change.
