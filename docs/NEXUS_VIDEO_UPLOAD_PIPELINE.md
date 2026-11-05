# NEXUS Video Upload and Playback

Updated: 2026-11-05

## Implemented in source

- PublishFlow accepts an exported MP4, WebM or QuickTime video, up to 200 MB.
- The browser obtains the signed-in user's Supabase access token and requests a one-time upload URL from `/api/social/upload-intent`.
- The server validates the session, file type and size, creates a Cloudflare Stream direct-creator upload URL, and creates private Supabase media/post records.
- The browser uploads directly to Cloudflare. The Cloudflare API token stays server-side.
- `/api/social/upload-status` checks the signed-in owner's media record and Cloudflare processing state. Completed videos remain private and their posts stay in processing/pending moderation.
- `/api/social/playback-token` checks post approval, audience visibility, private-profile rules, accepted follows and blocks before issuing a short-lived Cloudflare signed playback token.
- For You now requests a signed player URL for approved live community posts and renders the Cloudflare Stream player. Sample cards remain sample artwork.
- The feed only queries posts with a media asset, `status = ready`, and `moderation_state = approved`.

## Database migration required

Apply `supabase/migrations/202611050004_video_moderation_gate.sql` in the dedicated NEXUS Supabase project, after migrations 0001–0003. It adds the moderation gate and the Stream processing metadata fields, then updates the database visibility policy. Do not apply it to the separate AURORA VoiceText project.

## Server environment variables

Configure these on the server deployment only. Never put service-role or Cloudflare API tokens in `VITE_*` variables, browser code, GitHub source, or chat.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_TOKEN` (Cloudflare Stream Write and Read permissions)
- `CLOUDFLARE_STREAM_CUSTOMER_CODE` (the customer code from the Cloudflare Stream dashboard)

The browser continues to use the existing `VITE_SUPABASE_URL` and publishable/anon key for sign-in. Server credentials are separate.

## Current boundaries — not yet production complete

- The upload version uses basic POST for files up to 200 MB. Resumable TUS uploads for larger files or unstable connections are not included.
- The creator must export the finished video from Studio and select that file in PublishFlow. Automatic render-to-publish handoff is not yet wired.
- Playback tokens expire after 30 minutes and are requested only after the viewer is authorized. The Cloudflare customer code and provider API token are server-only.
- No public post is created automatically. The upload flow ends in a private draft awaiting review.
- A trusted moderator approval workflow is still required to move a post to `status = ready` and `moderation_state = approved`. Until then, the post cannot appear in For You.
- Moderation dashboard, automated content checks, creator deletion/cleanup, TUS uploads, playback retry UX, and end-to-end tests remain pending.
- No build, typecheck, live provider test, Supabase test, or device test has been run. No Vercel deployment was triggered.

## Provider references

- Cloudflare direct creator uploads: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
- Cloudflare signed playback tokens: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
- Cloudflare Stream Player: https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/
