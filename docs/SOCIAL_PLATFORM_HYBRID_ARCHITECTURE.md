# NEXUS Editor — Public For You Platform (Hybrid Architecture)

Status: **Architecture plan approved; implementation not started by this document.**

This plan adds a public creator-discovery and publishing experience to the existing NEXUS Editor. It is additive: preserve the current editor, project format, AI Director, Creative Fabric, import/export workflows, theme system and existing generation routes. Do not rebuild the app or replace existing source.

## 1. Architecture decision

Use a hybrid architecture with separate responsibilities:

| Layer | Responsibility | Planned technology |
|---|---|---|
| Identity and application data | Accounts, profiles, follows, posts, comments, likes, saves, reports, feed metadata | Supabase Auth + Postgres with Row Level Security (RLS) |
| Trusted application API | Authenticated mutations, validation, signed upload creation, webhooks, moderation actions and feed orchestration | Existing same-origin Vercel `/api/*` serverless routes |
| Video storage and delivery | Direct video upload, encoding, adaptive playback, thumbnails and delivery | Cloudflare Stream |
| Optional static media | Profile avatars and small static assets if needed | Supabase Storage initially; evaluate R2 only if usage justifies another service |
| Client | Editor, publish flow, public feed, profiles and interactions | Existing React + TypeScript + Vite app |

The existing Cloudflare Worker at `nexus-studio-ai.schoolershubit5.workers.dev` is currently documented as an AI text/image worker. Do not treat it as a video host or silently change its contract. Cloudflare Stream is a separate product and must be configured independently.

### Current-repository audit

- The app is React + TypeScript + Vite, with Vercel-style serverless handlers under `api/`.
- Existing API routes cover AI, generation and transcription; they do not currently provide a complete social identity/database layer.
- `package.json` currently has no Supabase client dependency, and the inspected source paths do not contain a connected Supabase auth client.
- Therefore, Supabase is a proposed new application-data service, not an existing confirmed NEXUS integration. Confirm the project/account and free-plan limits before provisioning or adding credentials.
- Existing editor projects and media remain user-owned editor data. Publishing creates a separate post record and a managed video asset; it must not destructively move or rewrite the original project.

## 2. Product behaviour

### Public access (decision A)

- Guests can browse and watch public posts without an account.
- Guests cannot like, comment, follow, save, upload, publish or access private posts.
- Authentication is required for creator actions.
- Public feed responses must never include private account fields, private project metadata, upload tokens or unpublished media URLs.
- Private and followers-only visibility must be enforced by the API/database and media delivery, not merely hidden in the UI.

### Core app destinations

1. **For You** — full-screen vertical public video feed with category/trending/discovery entry points.
2. **Studio** — existing editor, preserved as the primary creation workspace.
3. **Publish** — a workflow launched from a finished Studio project; no need to export to the phone and re-upload.
4. **Inbox/Activity** — follow, like and comment notifications, introduced after core publishing/feed reliability.
5. **Profile** — creator identity, public posts, follower/following counts and privacy controls.

The exact navigation can be adapted to the existing responsive shell; do not cram the social UI into the editor timeline screen.

## 3. Data model (initial version)

Use UUID primary keys, UTC timestamps, foreign keys, indexes and explicit status fields.

- `profiles`: `user_id` (auth user FK), `handle` (unique), `display_name`, `bio`, `avatar_path`, `visibility`, `created_at`, `updated_at`.
- `posts`: `id`, `user_id`, `caption`, `visibility` (public/followers/private), `status` (draft/uploading/processing/ready/blocked/removed/failed), `video_asset_id`, `thumbnail_asset_id`, `duration_ms`, `width`, `height`, `published_at`, `created_at`, `updated_at`.
- `media_assets`: `id`, `owner_id`, `provider`, `provider_asset_id`, `playback_id` (server-controlled), `upload_state`, `mime_type`, `size_bytes`, `duration_ms`, `created_at`. Never store raw provider API secrets in rows.
- `follows`: `follower_id`, `followed_id`, `created_at`; unique pair and no self-follow.
- `post_likes`: `user_id`, `post_id`, `created_at`; unique pair.
- `post_saves`: `user_id`, `post_id`, `created_at`; unique pair.
- `comments`: `id`, `post_id`, `user_id`, `parent_id` (nullable), `body`, `status`, `created_at`, `updated_at`.
- `post_views` or privacy-conscious aggregated view events: record only the minimum needed for feed quality, abuse prevention and creator analytics; define retention before collecting.
- `reports`: `id`, `reporter_id`, `target_type`, `target_id`, `reason`, `details`, `status`, `created_at`.
- `blocks`: `blocker_id`, `blocked_id`, `created_at`; unique pair.
- `moderation_events`: restricted staff/service-only audit trail for automated and human decisions.

Use database constraints for uniqueness and integrity. Add indexes for public-ready posts ordered by publish time, creator posts, follow lookups, post interactions and moderation queues. Denormalized counts, if added for feed speed, must be updated transactionally or reconciled; never trust client-submitted counts.

## 4. Upload and publish lifecycle

1. In Studio, user chooses **Publish**. Show a pre-publish review with caption, cover, category/tags, visibility, audio rights confirmation and content rules.
2. Client sends project/post metadata to a same-origin authenticated API route. The server validates the user session, rate limits the request and creates a `draft` post.
3. Client asks the server for a one-time Cloudflare Stream direct-upload URL. Server creates it using a private Stream API token; token never reaches the browser.
4. Client uploads the rendered video directly to Stream using the short-lived upload URL. Support progress, cancellation, retry and resumable/tus upload where supported by the provider and device.
5. A signed provider webhook updates the asset's processing state. Verify webhook authenticity, reject replay/invalid events and make processing idempotent.
6. When Stream reports the asset ready, server validates metadata and moderation status. Post becomes `ready` only after required checks pass.
7. Publish timestamp and public-feed eligibility are set only after the user confirms publish and all required checks succeed.
8. On failure, preserve the draft and editor project; show a clear retry/resume action. Never claim a post is published before server confirmation.

Keep a durable link between the published post and its source NEXUS project ID, but do not expose the project file or private assets publicly.

## 5. Playback and For You feed

- Use provider playback manifests/player URLs with adaptive bitrate. Do not proxy large video bytes through Vercel Functions.
- Load one active video and a small number of adjacent preloads; pause and release media outside the viewport.
- Use cursor/keyset pagination, not large offset scans. Return only public, ready, non-blocked posts.
- Exclude blocked creators and posts hidden by the viewer; apply visibility rules server-side.
- Start recommendations with a transparent, low-cost blend: recency, selected interests/categories, followed creators, and aggregate engagement. Avoid collecting sensitive traits or inferring protected characteristics.
- Add diversity/freshness controls so one creator or topic does not dominate every feed.
- Do not claim sophisticated personalisation until event quality and recommendation tests support it.
- Guests receive a safe public/trending feed; signed-in users can receive a more relevant feed based on explicit interests and limited interaction history.
- Respect reduced-data settings, autoplay preferences, captions and accessible playback controls.

## 6. Authentication and authorization

- Use Supabase Auth for email/password and supported Google/Apple OAuth flows, subject to provider setup and redirect-domain verification.
- Keep the previously requested ChatGPT sign-in as a separate gated integration: do not pretend it is an available OAuth provider. Implement only if official OpenAI partner access/approved OAuth credentials are obtained; otherwise show it as unavailable or omit it from the active sign-in screen.
- Use short-lived sessions with secure refresh handling; never store provider admin/service-role keys in the browser.
- Verify JWT/session on every protected server route.
- Enable RLS on all user-facing tables. Users may edit only their own profile/posts/comments; public read policies must expose only public, ready content; private/followers content requires server-verified authorization.
- Keep moderation tables and privileged actions service-only.
- Add account deletion/export and privacy settings before public launch.

## 7. Safety, moderation and rights

Public user-generated content requires safety operations before launch, not as a later polish item.

- Publish rules, age-appropriate defaults, report/block/mute controls and creator comment controls.
- Pre-publication checks for prohibited content, spam, malware-like payloads and suspicious upload behaviour; post-publication report queue and rapid takedown workflow.
- Human review path for uncertain automated decisions, appeals and audit history.
- Rate limits for account creation, comments, likes, follows, reports and uploads; bot/spam controls.
- Copyright/music policy: only provide sound/music assets with documented licences and permitted use; include rights declaration, complaint/takedown process and repeat-infringer policy.
- Default to conservative privacy and safety settings. Do not expose precise location or sensitive profile data.
- Apply applicable Nigerian data-protection and child-safety requirements; obtain appropriate legal review before public launch. Avoid behavioural profiling of minors and do not use sensitive traits for recommendations.

## 8. Cost and free-tier guardrails

- Treat all free allocations as quotas that can change, not a promise of unlimited hosting.
- Add configurable per-account upload size/duration limits, daily upload caps, rate limits and storage/egress monitoring.
- Compress and validate uploads client-side where practical, but enforce limits again server-side.
- Generate only the playback renditions needed by the chosen provider; avoid duplicate copies and unnecessary re-encoding.
- Add a kill switch for new uploads if a quota or budget threshold is reached while keeping existing published content readable where service limits permit.
- Before provisioning, compare current Supabase and Cloudflare Stream plan limits, supported regions, upload limits, pricing and data-retention terms. No paid plan or billing activation without explicit approval.

## 9. Implementation sequence (incremental, no deployment)

### Phase 0 — Discovery and provider readiness
- Confirm the Supabase project and account that should own NEXUS user data; inspect existing tables/policies before any migration.
- Confirm Cloudflare Stream availability and current account limits. Keep the existing AI Worker separate.
- Define canonical app origins, callback URLs, webhook secrets and local-development setup.
- Record environment-variable names only; never commit secret values.
- Acceptance: architecture and service limits documented; no existing editor behaviour changed.

### Phase 1 — Identity and data foundation
- Add the Supabase client and typed server-side auth verification.
- Add versioned SQL migrations, RLS policies, profile bootstrap and email/Google/Apple auth configuration.
- Add protected API helpers and tests for guest, owner, follower and unauthorized access.
- Acceptance: auth/session works in local test configuration; RLS tests prove users cannot read or mutate another user's private data.

### Phase 2 — Creator profile and social primitives
- Build profile editing, handles, follow/unfollow, likes, saves, comments and blocks.
- Add pagination, optimistic UI with rollback, uniqueness constraints and abuse rate limits.
- Acceptance: duplicate likes/follows are impossible; blocked relationships are respected; anonymous users can only read public data.

### Phase 3 — Video asset pipeline
- Add server-issued one-time Stream upload URLs, client upload progress/retry, signed webhook verification and asset lifecycle state machine.
- Keep provider tokens server-side; use idempotent webhook processing.
- Acceptance: test video moves through draft → uploading → processing → ready/failed; retries do not create duplicate posts; failed uploads preserve the editor project.

### Phase 4 — Publish from Studio
- Add a publish handoff from the existing editor that renders the current composition and opens the publish review.
- Keep project state unchanged; attach post and media asset IDs only after server creation.
- Support cover selection, caption, category, visibility, audio-rights confirmation and draft recovery.
- Acceptance: user can publish a finished edit without manually exporting and re-importing it; no post appears publicly before ready/approved.

### Phase 5 — Public For You and playback
- Build guest-accessible vertical feed, playback, pagination, category filters, trending and creator navigation.
- Add adaptive quality, reduced-data mode, caption controls and memory-conscious preloading.
- Acceptance: guests can browse public posts; private/followers posts never leak through feed, API or playback URLs.

### Phase 6 — Moderation, privacy and creator safety
- Add reporting, blocking, comment controls, moderation queue, takedown/appeal flows, rate limits, audit logs and account deletion/export.
- Acceptance: report-to-review-to-action path is tested; blocked users cannot interact; moderator actions are auditable.

### Phase 7 — Recommendations and analytics
- Add privacy-conscious event collection, creator analytics and staged recommendation ranking after baseline feed is stable.
- Acceptance: feed quality evaluated with test accounts and diversity checks; users can reset or limit personalisation.

### Phase 8 — Integration and release gates
- Test web and Android on low-memory devices and slow networks; test upload interruption/resume, playback, auth expiry, offline drafts, RLS, webhook replay, moderation and export-to-publish.
- Run security, accessibility, privacy, load and cost-quota reviews.
- Deploy only after explicit user approval and a confirmed rollback plan.

## 10. Non-goals and constraints

- Do not replace the current editor with a social app or make sign-in mandatory just to use local editing.
- Do not route video file bytes through serverless API functions.
- Do not store raw video blobs in Postgres.
- Do not expose Stream, Supabase service-role or webhook secrets to client code.
- Do not promise unlimited free storage, unlimited uploads or guaranteed reach.
- Do not use scraped or unlicensed music.
- Do not launch public uploads before reporting, moderation and takedown controls exist.
- Do not deploy or alter the existing Vercel project during planning/implementation unless the user explicitly authorizes release.

## 11. Definition of done

The For You platform is not complete until a guest can reliably browse public videos; a creator can securely authenticate, publish from Studio and manage a profile; likes/comments/follows/saves work with correct permissions; private content remains private; uploads and playback survive realistic mobile-network failures; moderation/reporting/takedown work; costs and quotas are observable; and web/Android integration passes documented tests.
