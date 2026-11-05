# NEXUS Supabase Community Feed Integration

Updated: 2026-11-05

## Implemented in this change

- Added `src/social/social-service.ts` as the client-side data access layer using the existing Supabase client and the signed-in user's session.
- The For You tab reads up to 30 ready public posts, newest first, subject to the database's RLS policies.
- The Following tab reads accepted follow relationships and requests ready posts from those creators. The database RLS policy remains the authority for whether a followers-only post is visible.
- Creator names and handles are resolved from `public.profiles`.
- Like and comment totals are calculated from visible interaction rows returned by RLS.
- Signed-in users can persist likes, saves, follows, comments and post reports.
- Existing interaction state is loaded for the signed-in user; comments are fetched when a live post's comment sheet opens.
- The existing sample cards remain as clearly labelled previews when the public feed is empty. Following does not substitute demo cards when there are no followed posts.

## Important limits

- The feed only displays posts whose database status is already `ready`. The client cannot promote a draft to ready.
- Video upload, transcoding, playback URLs, and the trusted publishing service are not implemented by this change. Cloudflare Stream is still a separate provider decision/configuration.
- The current feed renderer uses a designed visual card for community post metadata. It is not yet a video player and does not claim to play uploaded videos.
- The existing publish wizard is still a preparation/review flow; it does not create a public post or upload media.
- Profile sheets are lightweight previews, not complete creator profile pages.
- No Vercel deployment, Supabase secret-key use, or database migration was performed in this change.

## Runtime requirements

The app build must receive `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`. The secret/service-role key must never be placed in browser code or a Vite environment variable. OAuth providers and redirect URLs must be configured in Supabase Auth for those sign-in methods to work.

## Verification status

Source changes were committed to the GitHub repository. A local TypeScript/build check and live browser/database integration test have not been run, so this is implementation-complete at source level but not yet verified at runtime.
