# NEXUS Studio publishing and moderation pipeline

## Creator flow
1. The creator chooses an exported MP4, WebM, or QuickTime file (current route limit: 200 MB).
2. The server authenticates the creator, enforces the current per-account upload limit, creates a draft post and media record, then requests a signed Cloudflare Stream direct-upload URL.
3. The browser uploads directly to Cloudflare. The Studio UI shows progress and checks processing status; if processing takes longer, the creator can check again without uploading the file again.
4. When Cloudflare reports the asset ready, the trusted status API records media metadata and moves the post to `processing` with `moderation_state=pending`. It is not publicly playable or listed in the public feed.
5. A verified moderator sees the item in Moderation Centre → Video review. A short-lived, moderator-only preview token is issued for review.
6. The moderator approves or rejects. The database RPC locks the post and media rows and commits post state, media state, published timestamp, and audit event together.
7. Approval sets the post to `ready/approved`; its existing audience setting controls visibility (public, accepted followers, or owner-only). Rejection sets post/media to blocked/rejected. The creator can appeal through the existing appeal workflow.

## Trusted server configuration
The API requires the existing server-only Supabase service role and Cloudflare Stream credentials. Never expose the service-role key or Cloudflare API token in Vite/client variables or source control. The preview endpoint also needs `CLOUDFLARE_STREAM_CUSTOMER_CODE`.

## Database migration
Apply `supabase/migrations/202611060003_publish_moderation_pipeline.sql` after the previously applied social foundation, video moderation gate, moderator roles, appeals, and atomic moderation migrations. It creates `nexus_review_pending_post`, executable only by `service_role`.

## Important status meanings
- `draft`: creator's initial private post record.
- `processing + pending`: upload accepted and waiting for moderation after provider processing.
- `ready + approved`: approved and available only to the selected audience.
- `blocked + rejected`: rejected; unavailable for playback and eligible for the creator appeal flow.
- `failed`: provider processing failed; not published.

This code path is implemented in the repository, but it still depends on applying the new migration, configuring the server secrets, assigning a moderator role, and testing a real Cloudflare Stream upload end to end.
