# NEXUS Video Pipeline — Foundation

Updated: 2026-11-05

## Implemented in source

### Private upload workflow
- Studio's Publish dialog now accepts an exported MP4, WebM or QuickTime file from the device.
- Current client upload limit is 200 MB. The server requests a maximum duration of 600 seconds.
- The browser obtains the user's current Supabase access token and requests a short-lived upload intent from the same-origin API.
- The API validates the authenticated Supabase user, MIME type, file size and a basic per-user daily draft limit.
- The API creates an owner-linked media record and a private post draft, then requests a Cloudflare Stream Direct Creator Upload URL.
- The browser uploads the file directly to Cloudflare; the video bytes do not pass through the Vercel function.
- Upload progress is shown in the Publish dialog.
- The client polls an owner-only status endpoint. The server checks Cloudflare processing state and stores dimensions, duration, thumbnail and provider playback metadata.
- Uploaded videos remain private drafts with moderation_state=pending. They are not included in public feeds and are not published automatically.

### Server routes
- `POST /api/social/upload-intent`
- `GET /api/social/upload-status?mediaAssetId=<uuid>`

Shared server-only helpers live in `server/social-api.ts`, outside the Vercel API route directory. The Supabase service-role key and Cloudflare token are read only by server code; neither is referenced by the browser bundle.

### Database
- Migration: `supabase/migrations/202611050004_video_pipeline.sql`
- Adds moderation state and review metadata to posts, provider-ready metadata to media assets, and a moderation queue index.
- The database trigger blocks browser clients from approving moderation or changing publishing state.
- Apply this migration in the dedicated NEXUS Supabase project before testing uploads.

## Required server environment variables

Set these only in the server environment (never in Vite client variables or GitHub source):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or server-readable `VITE_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_TOKEN`

The Cloudflare token should have only the Stream permissions required to create Direct Creator Uploads and read video status. Do not paste secret values into chat or commit them.

If these values are absent, the upload endpoint returns a safe 503 response and leaves the existing editor usable. Cloudflare Stream is a metered provider; check current plan and usage pricing before enabling uploads.

## Explicitly not complete

- The editor does not yet pass its own rendered export Blob directly into Publish. The current workflow selects an exported video from the device.
- Public feed playback and signed playback-token issuance are not connected.
- No moderation dashboard/reviewer workflow is connected. Uploads remain private drafts until a trusted moderation and publishing service approves them.
- No public publishing endpoint is enabled.
- No automatic thumbnail/cover selection UI, creator draft manager, resumable TUS upload, or retry/resume after app closure yet.
- Cloudflare Stream account configuration and live credentials have not been verified.

## Safety and limits

- No client-side service-role or Cloudflare API token.
- Direct upload URL is short-lived (one hour) and not stored in public post data.
- Signed playback is required by the provider upload request.
- File types are restricted to MP4, WebM and QuickTime; maximum upload size is 200 MB; requested maximum duration is 10 minutes.
- New content stays in a private draft and is not discoverable until moderation/publishing is built.

## Verification status

GitHub source changes are committed. No build, typecheck, deployed API test, Cloudflare upload, Supabase live test or Android browser test has been run. No deployment was triggered.
