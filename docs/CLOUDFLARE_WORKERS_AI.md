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
- Add per-user rate limits before enabling this proxy for public use.
- Model identifiers and input fields vary by model. Override defaults only with model IDs and input schemas supported by the account.
- Free allocation and model availability can change. A successful code build does not prove a live request will work.