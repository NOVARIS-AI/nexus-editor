# NEXUS Saved Videos & Collections

## Implemented

- Added a private Saved Videos page reachable from the workspace navigation and the For You feed.
- Loads the signed-in creator's saved posts from Supabase, respecting the existing post visibility policies.
- Opens saved community videos through the existing secure playback-token service.
- Creates named collections with an optional description.
- Adds saved posts to collections, removes posts from a collection without unsaving them, and deletes collections without deleting saved posts.
- Un-saving a post removes its collection memberships automatically.
- Keeps all collection records private to their owner with Supabase Row Level Security.
- Guest users are asked to sign in before accessing their saved library.

## Database setup required

Apply `supabase/migrations/202611050007_saved_collections.sql` in the dedicated NEXUS Supabase project's SQL Editor. It creates:

- `saved_collections`
- `saved_collection_posts`
- Owner-only RLS policies
- A cleanup trigger that removes collection links when the owner unsaves a post

The migration depends on the existing social foundation migration (`202611050002_social_foundation.sql`) and the shared `set_profile_updated_at()` function from the profiles migration. It does not touch the separate AURORA VoiceText Supabase project or the starter `Nexus editor` table.

## Honest limitations

- The library only lists posts that remain readable under the existing post visibility and block rules. If a creator changes privacy or removes a post, it may no longer appear.
- Playback still depends on the existing Cloudflare Stream configuration and ready/approved media state.
- The implementation has been committed to GitHub but has not been built, type-checked, deployed, or tested on a phone in this change.
