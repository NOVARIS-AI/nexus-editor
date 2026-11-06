# NEXUS Studio — Cloudflare Worker runtime setup

The app is deployed as the `nexus-studio-app` Worker. Its public deployment URL is:

`https://nexus-studio-app.schoolershubit5.workers.dev`

The source repository deploys the Worker and static assets through GitHub Actions. The deployment token used by GitHub Actions is not automatically copied into the Worker runtime.

## Required runtime secrets

In Cloudflare Dashboard, open **Workers & Pages → nexus-studio-app → Settings → Variables and Secrets**. Add the following as encrypted secrets (not plain-text variables):

| Name | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase access for moderation and publishing APIs |
| `GROQ_API_KEY` | Audio transcription provider |
| `CLOUDFLARE_API_TOKEN` | Server-side Workers AI API access |
| `CLOUDFLARE_STREAM_TOKEN` | Cloudflare Stream upload and playback operations |
| `NEXUS_WORKER_TOKEN` | Authenticates calls to the separate NEXUS AI Worker |

## Runtime variables

Add these as variables (the Supabase URL and public key are public app configuration, not service-role credentials):

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public/anon key |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID used by Workers AI and Stream |
| `CLOUDFLARE_STREAM_CUSTOMER_CODE` | Stream playback customer code |
| `NEXUS_WORKER_URL` | HTTPS URL of the separate NEXUS AI Worker |
| `NEXUS_APP_ORIGIN` | Set to the final app origin after the custom domain is attached |

The following optional engine pairs can be added when those services are available:

- `NEXUS_IMAGE_ENGINE_URL` and `NEXUS_IMAGE_ENGINE_TOKEN`
- `NEXUS_VIDEO_ENGINE_URL` and `NEXUS_VIDEO_ENGINE_TOKEN`
- `NEXUS_AUDIO_ENGINE_URL` and `NEXUS_AUDIO_ENGINE_TOKEN`
- `NEXUS_RENDER_ENGINE_URL` and `NEXUS_RENDER_ENGINE_TOKEN`

Optional OpenAI-compatible brain configuration, if used: `NEXUS_AI_API_KEY`, `NEXUS_AI_BASE_URL`, and `NEXUS_AI_MODEL`.

## Verify

After saving the runtime values, use:

- `/api/health` — reports which runtime integrations are configured; it never returns secret values.
- `/api/engine-status` — reports available AI engine connections.

A healthy static deployment does not mean the private API integrations are configured. Test Google/email sign-in, transcription, AI generation, and Stream publishing separately before switching the production domain.

Do not put service-role keys, provider tokens, or worker tokens in `VITE_*` variables or browser code. Do not commit secrets to Git.
