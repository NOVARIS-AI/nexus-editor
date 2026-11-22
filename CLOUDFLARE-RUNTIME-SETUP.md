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


## AI Director production release gates

The AI Director production pipeline is split into local editor work and optional remote providers. A feature branch or passing static build does not mean that remote media providers or the production Worker are live.

### What the app can do locally

- Build an editable storyboard on the real timeline, including scene clips, title layers and audio clips.
- Keep scene checkpoints, attempts, review decisions and retry state in local project storage.
- Pause at safe scene boundaries, recover interrupted local work, and preserve already completed scenes.
- Run the browser render pipeline with export preflight, project-quality checks, cancellation, output validation and Android save/share support where the native bridge is installed.

### Provider readiness

- **Image:** Cloudflare Flux Schnell is an image-generation route, not a video-generation provider. Confirm the image Worker responds with a downloadable HTTPS image and a valid MIME type.
- **Video:** a real prompt-to-video provider is optional. Configure `NEXUS_VIDEO_ENGINE_URL` and `NEXUS_VIDEO_ENGINE_TOKEN` only after the target Worker exists and its job API has been tested. The Worker must return a completed job with an HTTPS media URL and a truthful video MIME type. A generated still or animated timeline composition must not be labelled as AI-generated video.
- **Audio:** the dedicated router is not deploy-ready while `workers/audio/wrangler.toml` still contains `REPLACE_WITH_AUDIO_JOBS_KV_NAMESPACE_ID`. Create the KV namespace, replace that ID, create the R2 bucket, configure encrypted secrets, and deploy the audio Worker before adding its URL/token to the main app Worker.
- **Render:** the current default export is rendered in the browser. Remotion, HyperFrames and FFmpeg are optional server-side routes and remain unavailable until their actual worker endpoints and tokens are configured.

### Release verification sequence

1. Keep feature work on its pull request until GitHub Actions regression tests, TypeScript checks and the production build all pass.
2. Verify the main Worker health endpoint and engine status after runtime configuration. A configured flag is not proof that a provider can complete a real media job.
3. Run a real image job, video job (only if a real video provider is configured), audio job and browser export. Confirm each returned file can be downloaded, decoded and played.
4. Test the full AI Director flow on Android: approve plan, create scenes, wait for remote jobs, restart the app, recover checkpoints, retry one failed scene, review the draft, and export/share the final file.
5. Only after those checks should the owner authorize merging and production deployment. Do not treat a Vercel preview check or an open pull request as a production release.

Never copy provider secrets into the repository, project JSON, Android bundle, or `VITE_*` browser variables.
