# Cloudflare Workers AI setup for NEXUS

NEXUS can use Cloudflare Workers AI as a server-side AI provider. This does not require an OpenAI API key. Account limits, model availability, and current plan quotas still apply.

## Server environment variables

Set these only in a trusted server environment, never in Vite variables, browser code, the APK, or committed files:

- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.
- `CLOUDFLARE_API_TOKEN` — account API token with Workers AI permission.
- `NEXUS_CF_TEXT_MODEL` — optional; defaults to `@cf/meta/llama-3.1-8b-instruct`.
- `NEXUS_CF_IMAGE_MODEL` — optional; defaults to `@cf/black-forest-labs/flux-1-schnell`.

An adult account holder should manage account creation, access and billing controls. Do not enable paid services or add a payment method for this $0 setup. Check the account dashboard for current free allocation before running jobs.

## Routes

`POST /api/ai-director` prefers the existing OpenAI-compatible provider when all three NEXUS_AI variables are configured. If they are absent and Cloudflare is configured, it uses Workers AI for storyboard generation.

`POST /api/cloudflare-ai` supports `task: text` and `task: image`. Text requests can provide `prompt` or `messages`; image requests provide `prompt` and model-specific `options`. The image route returns a PNG data URL.

Important: this image endpoint is synchronous. It is not yet wired into the editor's asynchronous generation-job importer, so image generation is not yet a completed in-editor feature.

## Security and limits

- Keep credentials server-side.
- Restrict the API token to the minimum Workers AI permissions needed for model execution.
- Never expose the token through public client configuration.
- The included in-memory limit is best-effort and is not a substitute for authenticated per-user quotas on a public production service.
- Model identifiers and input fields vary by model. Override defaults only with model IDs and input schemas supported by the account.
- Free allocation and model availability can change. A successful code build does not prove a live request will work.

## Secure app connection (Worker deployment is separate from app configuration)

The deployed Worker URL and its bearer token must remain server-side. Never add `NEXUS_WORKER_TOKEN` to a `VITE_*` variable or browser storage.

Configure these server environment variables when the app backend is next deployed:
- `NEXUS_WORKER_URL=https://nexus-studio-ai.schoolershubit5.workers.dev`
- `NEXUS_WORKER_TOKEN=<the same private token configured as the Worker secret>`
- Optional `NEXUS_APP_ORIGIN=<the exact production app origin>`

The `/api/nexus-worker` server route proxies text/image requests to the Worker, validates image data, exposes a server-side health check at `GET /api/nexus-worker`, and applies a best-effort per-instance rate limit (3 image requests or 12 text requests per 10 minutes per network). The AI Director can use the Worker as its text fallback when these server variables exist. The browser image helper is `generateNexusWorkerImage()`; it calls the same-origin proxy and never receives the Worker secret. Storyboard scene images and selected image-layer replacements are imported automatically; missing storyboard visuals are generated sequentially to reduce pressure on low-memory Android devices and free model quotas.

**Important:** GitHub Actions secrets do not automatically become runtime variables on the app host. Vercel has intentionally not been changed. Until the server variables are configured there and a real request is tested, the app UI must not be described as connected to live generation. The Worker deployment itself is complete; the Worker connection still needs a live app-host request test, and video generation still requires a separate video worker.
