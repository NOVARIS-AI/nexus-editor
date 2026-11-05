# NEXUS Creator Profiles — Implementation Note

Updated: 2026-11-05

## Implemented

- The creator sheet now requests live profile data from the dedicated NEXUS Supabase project using the creator's username.
- Live profile details include display name, username, avatar URL, bio, creator-selected topics, public ready-post count and accepted follower count.
- Profile counts are calculated from rows the signed-in/public session is permitted to read; the browser never uses a service-role key.
- Existing self-profile topic editing remains available and writes to the signed-in creator's own profile.
- Sample creator sheets remain clearly labelled as previews when the feed is showing sample content.

## Dependencies

- Requires the existing profile migration `202611050001_profiles.sql`.
- Requires the social foundation migration `202611050002_social_foundation.sql` for follows and posts.
- Requires `202611050003_nexus_pulse_v2.sql` for `profiles.creator_topics`, which is also used by NEXUS Pulse 2.0.
- The creator sheet does not bypass Supabase RLS. Private profiles that the viewer is not allowed to read will not return profile details.

## Not included yet

- Dedicated full-screen creator profile route.
- Avatar upload and image moderation.
- Creator analytics, notifications and follow-request inbox.
- Actual media playback, video upload or publishing. Those still require an approved video provider and trusted server-side upload/publish service.

## Verification

Source changes are committed to GitHub. No local build, typecheck, live Supabase test or mobile-browser test has been run. No Vercel deployment was triggered.
