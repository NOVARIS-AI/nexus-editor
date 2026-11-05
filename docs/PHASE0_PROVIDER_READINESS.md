# NEXUS Public Platform — Phase 0 Provider Readiness

Status: **Repository audit completed; external provider ownership/configuration remains pending.**
Date: 2026-11-05

## Confirmed from the current main branch

- Frontend: React 18 + TypeScript + Vite 6.
- API pattern: Vercel-style serverless handlers in the root `api/` directory.
- Existing dependencies: no Supabase JS client is currently declared in `package.json`.
- Existing environment template: `.env.example` contains AI, Cloudflare Worker, media-engine and Groq variables, but no Supabase or Cloudflare Stream variables.
- No `src/lib/supabase.ts` or `src/integrations/supabase/client.ts` exists at the inspected paths.
- Existing Cloudflare Worker is documented for AI text/image requests at `/v1/generate`; it is not a video upload/streaming service.
- Existing editor project/media handling must remain separate from social post records and managed Stream assets.
- The project build script is `tsc -b && vite build`; test script is `vitest run`.

## Provider readiness findings

### Supabase
**Not yet connected to this repository.** The account/project intended to own NEXUS identity and social data has not been confirmed. Do not reuse another product's Supabase project merely because it is available in prior context. Before provisioning:
1. Confirm the dedicated NEXUS Supabase project/account.
2. Inspect existing schema and policies before migrations.
3. Confirm current free-plan limits, region and project availability.
4. Prepare Auth redirect URLs for local development and the canonical app domain.
5. Keep the service-role key server-only; browser may receive only the anon/publishable key and URL.

### Cloudflare Stream
**Not yet connected or verified.** No Stream account entitlement, storage/egress allocation, API token, webhook secret or account limits have been verified. The existing AI Worker credentials are not Stream credentials. Before integration:
1. Confirm Cloudflare Stream is enabled for the intended account.
2. Review current pricing, free/trial allocation if any, supported upload methods, file/duration limits, playback controls and regional availability.
3. Decide maximum upload size/duration and initial quality policy.
4. Create a narrowly scoped Stream API token only when implementation is ready.
5. Store Stream token and webhook secret only in server-side runtime configuration.
6. Confirm signed webhook verification and upload URL expiry behaviour.

Do not create a paid subscription, add a payment method, provision a new paid resource or enable billing without explicit approval.

## Safe next implementation boundary

Until the provider project/account is confirmed, implementation may proceed on provider-independent work:
- typed domain contracts and validation schemas;
- UI shell/navigation for For You, Profile and Publish;
- local-only mock fixtures for development, clearly separated from production API;
- SQL migration drafts reviewed before execution;
- API interfaces with explicit unconfigured responses.

Do not ship a fake login, fake upload, fake feed, or UI that claims content has been published. Do not write live provider credentials into GitHub or `.env.example`.

## Required confirmation to begin Phase 1

The owner must identify the dedicated Supabase project/account intended for NEXUS and confirm whether Cloudflare Stream is available on the intended Cloudflare account. If not available, compare an appropriate video provider before selecting one. No deployment is part of this phase.
