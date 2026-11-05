# NEXUS Pulse 2.0 setup

1. Open the dedicated NEXUS Supabase project (not the separate AURORA VoiceText project).
2. Open SQL Editor and create a new query.
3. Copy the complete contents of `supabase/migrations/202611050003_nexus_pulse_v2.sql`.
4. Run it once. It adds post topics, creator topics, and private per-user feed preferences. It does not modify or delete the starter `Nexus editor` table.
5. Do not paste the Supabase secret/service-role key into the app, browser, GitHub, or this SQL query.

After the migration is applied and the app is built with the public Supabase URL and publishable/anon key, signed-in creators can set topics from their own profile sheet. Signed-in viewers can train preferences from Discover and use Not interested / Hide creator. Their choices persist in `feed_preferences`.

The application source is committed, but the deployed app has not been updated and the integration has not yet been runtime-tested.
