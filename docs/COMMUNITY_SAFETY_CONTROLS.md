# NEXUS Community Safety Controls

## Added to the For You feed

- Live community posts can be reported using a specific reason: spam, harassment, hate, sexual/inappropriate content, violence or dangerous activity, self-harm content, copyright/impersonation, misinformation, or other.
- Reporters can add optional context (up to 2,000 characters).
- Reports are submitted to the existing private moderation queue; the UI explains that submission does not automatically remove content.
- Signed-in users can block another creator from a live post's More menu.
- Blocking inserts an owner-scoped row in `public.blocks`, removes follows between both accounts, and updates the viewer's private NEXUS Pulse hidden-creator preference.
- The existing database post-visibility policy uses `is_nexus_blocked` to hide content when either account has blocked the other.
- Demo/sample cards remain clearly marked as previews and do not create real moderation records.

## Database requirements

Uses existing `reports` and `blocks` tables and their RLS policies from `202611050002_social_foundation.sql`. No new migration is required for this UI/service slice. The existing NEXUS Pulse preferences migration is also required for persistent hidden-creator feed preferences.

## Not yet implemented

- Staff-only moderation dashboard and moderator role assignment.
- Review/appeal workflow, audit UI, automated spam detection and rate limiting.
- User-facing blocked-creators management/unblock screen.
- Comment/profile reporting UI (the database report model supports those target types, but this screen currently reports posts).
- End-to-end security tests, build/typecheck and Android device testing.

## Verification

Source files committed to GitHub. No build, typecheck, live Supabase integration test or phone test has been run. No deployment was performed.
