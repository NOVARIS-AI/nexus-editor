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

## NEXUS Audio Router

The app uses a dedicated Cloudflare Worker in `workers/audio` for AI audio. The router supports:

- **ElevenLabs** for AI voiceovers, character speech, music and sound effects.
- **Stable Audio 3** for prompt-generated music, ambience and sound effects. If Stable Audio is not configured, music/SFX jobs can fall back to ElevenLabs when its key is configured.
- **Disband** for separating an uploaded audio file into vocals and instrumental stems. The primary stem is added to the timeline and additional stems go into the media library.
- **Wikimedia Commons** for licensed audio discovery with creator and licence metadata retained.
- **NEXUS Offline Audio** for locally synthesised fallback sounds and music beds.

### Deploy the dedicated audio worker

1. Create a Cloudflare KV namespace for audio job records and replace the placeholder ID in `workers/audio/wrangler.toml`.
2. Create the R2 bucket named `nexus-audio-outputs`. Configure a lifecycle rule to expire generated audio objects after one day.
3. From the `workers/audio` directory, add these encrypted Worker secrets:
   - `NEXUS_AUDIO_WORKER_TOKEN`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_DEFAULT_VOICE_ID` (needed for generated speech)
   - `STABILITY_API_KEY`
   - `DISBAND_KEY`
4. Deploy that Worker with Wrangler. The Worker exposes authenticated `POST /jobs`, authenticated `GET /jobs/:id`, authenticated `POST /separations`, and temporary audio delivery at `GET /assets/:id`.
5. In the main `nexus-studio-app` Worker, add these encrypted secrets:
   - `NEXUS_AUDIO_ENGINE_URL` — HTTPS base URL of the dedicated audio Worker.
   - `NEXUS_AUDIO_ENGINE_TOKEN` — the same bearer token as `NEXUS_AUDIO_WORKER_TOKEN`.

The provider keys stay in the dedicated audio Worker. The main app receives only the audio Worker URL and its server-to-server token. Never place provider keys in `VITE_*` variables, browser code, project files, or Git.

### Audio job behaviour

The AI Studio queues Stable Audio music/SFX jobs when the router is configured. The Voiceover tool queues ElevenLabs speech jobs. The Audio > Beats panel includes **Separate vocals & instruments**, which uploads the selected audio to Disband after the user explicitly starts the operation. Completed files are checked for audio MIME type, downloaded through the authenticated server-side audio-asset proxy (the browser never receives the worker token), imported into the project library, and placed on the timeline where applicable.

Disband accepts audio files up to 100 MB in this integration. The service processes the uploaded source audio; only upload files you have the right to process. Generated and sourced audio still needs a licence check for the intended use, especially commercial distribution.
