# NEXUS Video Upload Pipeline

Updated: 2026-11-05

## Implemented in source

- PublishFlow accepts a finished exported video file (MP4, WebM or MOV).
- Client-side checks enforce a maximum file size of 200 MB and maximum duration of 10 minutes.
- The browser obtains the signed-in user's Supabase access token and requests a one-time upload URL from `/api/social/create-upload`.
- The server validates the user session, file metadata and upload limits, creates a Cloudflare Stream direct-creator upload URL, and creates private Supabase media/post records.
- The browser uploads the video directly to Cloudflare using the one-time URL. The Cloudflare API token never reaches the browser.
- `/api/social/stream-webhook` verifies Cloudflare's HMAC-SHA256 webhook signature and updates media/post processing state.
- `/api/social/upload-status` returns only the signed-in owner's upload state; the PublishFlow checks for processing completion and review status.
- Upload URL creation is limited to five upload attempts per account per hour, in addition to the file size and duration caps.
- Newly uploaded posts remain pending moderation. The feed now filters for both `status = ready` and `moderation_state = approved`.
- Existing ready posts are marked approved by migration 0004 to preserve the existing feed.

## Database migration required

Apply `supabase/migrations/202611050004_video_moderation_gate.sql` in the dedicated NEXUS Supabase project, after migrations 0001–0003. It adds a server-controlled moderation state and updates the post visibility policy. Do not apply this to the separate AURORA VoiceText project.

## Server environment variables

Configure these on the server deployment only. Never put service-role or Cloudflare API tokens in `VITE_*` variables, browser code, GitHub source, or chat.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_TOKEN` (Cloudflare Stream Write and Read permissions)

The browser still uses the existing `VITE_SUPABASE_URL` and publishable/anon key for sign-in. Server credentials are separate.

## Processing status

The PublishFlow checks the existing owner-scoped `/api/social/upload-status` endpoint while the app remains open. This endpoint reads the video's status from Cloudflare and updates the private Supabase records. No webhook subscription is required for this first version.

## Current boundaries — not yet production complete

- This first upload version accepts files up to 200 MB via basic POST. Resumable TUS uploads for larger files or unstable connections are not included.
- The creator must export the finished video from Studio and select that file in PublishFlow. Automatic render-to-publish handoff is not yet wired.
- Uploaded videos use signed playback URLs, but the signed playback-token endpoint/player is a later task.
- Stream processing completion moves the post to processing/pending moderation. No public post is created automatically.
- Moderator review/approval tooling, automated content checks, signed playback, retry/cleanup tools, and end-to-end abuse/rate limiting still need implementation before public launch.
- A failed or abandoned upload may leave a private failed/uploading record for cleanup; it cannot enter the public feed.
- No build, typecheck, live provider test, Supabase test, or device test has been run. No deployment was triggered.

## Provider references

- Cloudflare direct creator uploads: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
- Cloudflare Stream webhooks and signature verification: https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/
