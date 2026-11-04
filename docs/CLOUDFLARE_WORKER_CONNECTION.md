# NEXUS Cloudflare Worker connection

The Cloudflare Worker is deployed at:

`https://nexus-studio-ai.schoolershubit5.workers.dev`

## Secure application connection

The browser must call only the same-origin `/api/nexus-worker` route. Never put `NEXUS_WORKER_TOKEN`, `CLOUDFLARE_API_TOKEN`, or any other bearer secret in Vite variables, browser storage, or client-side code.

Configure these **server-side runtime environment variables** on the hosting platform that runs the `/api` routes:

- `NEXUS_WORKER_URL=https://nexus-studio-ai.schoolershubit5.workers.dev`
- `NEXUS_WORKER_TOKEN=<the same private token configured as the Worker secret>`
- Optional: `NEXUS_APP_ORIGIN=<the exact deployed app origin>`

The GitHub Actions secrets used to deploy the Worker do not automatically become runtime variables on the app host. Do not paste any token into chat or commit it to the repository.

## What is connected in the editor

- AI image requests go through `/api/nexus-worker`, which holds the bearer token on the server.
- Generated images are validated, imported into the media library, and placed on the timeline.
- Requests mentioning a background/backdrop create a full-frame image layer.
- Regenerate/replace preserves the selected image layer's timing, position, scale, opacity, and stacking.
- The AI Director text route can use the Worker when its server-side Worker URL and token are configured.

## Current boundaries

- The Worker currently exposes synchronous text and image generation at `/v1/generate`; it does not provide video generation or asynchronous `/jobs` endpoints.
- Video generation remains an optional separately configured engine. The editor must not mark it as generated until a real worker job returns a valid output.
- Cloudflare usage is subject to the account's available Workers AI quota and model availability. Do not enable paid billing to make this integration work.
- The app host must redeploy/restart after server environment variables are changed. Vercel has intentionally not been modified as part of this repository work.
