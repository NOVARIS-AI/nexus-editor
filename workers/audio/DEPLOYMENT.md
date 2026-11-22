# NEXUS Audio Router deployment

This Worker is deployed separately from the main NEXUS app. The repository includes a manual GitHub Actions deployment so the setup can be run from GitHub on a phone without installing Wrangler locally.

## One-time Cloudflare setup

1. In Cloudflare, create a KV namespace named `AUDIO_JOBS`. Copy its 32-character namespace ID.
2. Create an R2 bucket named `nexus-audio-outputs`.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions**.
4. Add the repository variable `AUDIO_JOBS_KV_ID` with the KV namespace ID.
5. Add these repository secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN` — token must be allowed to deploy Workers, manage Worker secrets, read KV namespace metadata, and list R2 buckets.
   - `NEXUS_AUDIO_WORKER_TOKEN` — generate a long random value; the main app Worker must use the same token.
6. Add provider secrets only for services you actually have:
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_DEFAULT_VOICE_ID`
   - `STABILITY_API_KEY`
   - `DISBAND_KEY`

Never put secret values in source files, chat messages, GitHub variables, or client-side `VITE_*` settings. Provider secrets belong in GitHub Actions Secrets and are uploaded to Cloudflare as encrypted Worker secrets.

## Deploy from a phone

1. Open the repository's **Actions** tab.
2. Select **Deploy NEXUS Audio Router**.
3. Tap **Run workflow** and select the feature branch you want to deploy.
4. Wait for the validation and deployment steps to finish.

The workflow replaces the local Wrangler KV placeholder only in its temporary checkout; it does not commit or expose the namespace ID. It verifies the R2 bucket exists, uploads only non-empty provider secrets, and deploys `workers/audio`.

## Connect the main app Worker

After deployment, copy the audio Worker HTTPS URL. In Cloudflare Dashboard, open the main `nexus-studio-app` Worker and add these encrypted secrets:

- `NEXUS_AUDIO_ENGINE_URL` — the deployed audio Worker URL.
- `NEXUS_AUDIO_ENGINE_TOKEN` — exactly the same value as `NEXUS_AUDIO_WORKER_TOKEN`.

Then check `/api/engine-status` and run a small voiceover test. A configured flag alone is not proof that each provider can generate successfully; verify each provider separately.

## Notes

- ElevenLabs voice generation requires both its API key and a valid default voice ID.
- Stable Audio and Disband are optional; the router must not advertise them as available unless their credentials are configured.
- Keep the R2 lifecycle policy short for temporary generated audio, but do not apply a one-day deletion policy until confirming that users' saved projects copy outputs into durable project storage.
- This workflow deploys only the dedicated audio Worker. It does not deploy the main app, merge a pull request, or change the production domain.
