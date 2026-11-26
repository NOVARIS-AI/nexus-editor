# NEXUS Audio Router deployment

This Worker is deployed separately from the main NEXUS app. The repository includes a manual GitHub Actions deployment so the setup can be run from GitHub on a phone without installing Wrangler locally.

## One-time setup

1. Create a KV namespace named `AUDIO_JOBS` in Cloudflare and copy its namespace ID.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions**.
3. Add the repository variable `AUDIO_JOBS_KV_ID` with the KV namespace ID.
4. Add these repository secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN` — token must be allowed to deploy Workers, manage Worker secrets, and read KV namespace metadata.
   - `NEXUS_AUDIO_WORKER_TOKEN` — generate a long random value; the main app Worker must use the same token.
   - `SUPABASE_URL` — the project URL, for example `https://YOUR_PROJECT.supabase.co`.
   - `SUPABASE_SERVICE_ROLE_KEY` — the project's service-role key. Keep it server-side only; never use it in a `VITE_*` variable or expose it in the app.
5. Add provider secrets only for services you actually have:
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_DEFAULT_VOICE_ID`
   - `STABILITY_API_KEY`
   - `DISBAND_KEY`

The audio Worker creates the private Supabase Storage bucket `nexus-audio-outputs` automatically on the first successful upload. The bucket name is configurable through the Worker variable `SUPABASE_AUDIO_BUCKET`. No Cloudflare R2 bucket or R2 binding is required.

## Deploy from a phone

1. Open the repository's **Actions** tab.
2. Select **Deploy NEXUS Audio Router**.
3. Tap **Run workflow** and select the feature branch you want to deploy.
4. Wait for validation and deployment to finish.

The workflow replaces the local Wrangler KV placeholder only in its temporary checkout; it does not commit or expose the namespace ID. It uploads the Supabase credentials and configured provider secrets as encrypted Worker secrets, then deploys `workers/audio`.

## Connect the main app Worker

After deployment, copy the audio Worker HTTPS URL. In Cloudflare Dashboard, open the main `nexus-studio-app` Worker and add these encrypted secrets:

- `NEXUS_AUDIO_ENGINE_URL` — the deployed audio Worker URL.
- `NEXUS_AUDIO_ENGINE_TOKEN` — exactly the same value as `NEXUS_AUDIO_WORKER_TOKEN`.

Then check `/api/engine-status` and run a small voiceover test. A configured flag alone is not proof that each provider can generate successfully; verify each provider separately.

## Storage and security notes

- Audio objects are stored in a **private** Supabase Storage bucket. The Worker proxies downloads through its authenticated asset route; it does not make the bucket public.
- The service-role key bypasses Supabase Row Level Security. It must exist only as an encrypted Cloudflare Worker secret and must never be sent to the browser.
- Supabase Storage quotas and file-size limits still apply. Keep generated files reasonably sized and remove unused outputs according to the product's retention policy.
- ElevenLabs voice generation requires both its API key and a valid default voice ID.
- Stable Audio and Disband are optional; the router must not advertise them as available unless their credentials are configured.
- This workflow deploys only the dedicated audio Worker. It does not deploy the main app, merge a pull request, or change the production domain.
