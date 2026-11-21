# NEXUS Editor Audio Engine

NEXUS uses a server-side Cloudflare audio router. Provider keys never belong in browser code, Vite variables, Git, or project files.

## Providers and responsibilities

- **ElevenLabs**: character dialogue, narration, voiceover, sound effects and music. Music API access is paid-plan gated; use Music v2.5.
- **Stable Audio 3**: prompt-to-music, ambience, loops and sound effects. Its API is asynchronous: NEXUS stores the provider job ID and polls for the finished audio.
- **Disband**: stem separation for vocals, instrumental drums, bass, guitar, piano and other supported stems. NEXUS uploads the selected source audio through the authenticated worker, polls the job, and imports returned stems into the media library.
- **Wikimedia Commons**: search reusable existing audio and retain creator/licence/attribution metadata.
- **NEXUS local engine**: offline procedural audio fallback.

## Cloudflare setup

From `workers/audio`:

1. Create a KV namespace and replace the placeholder namespace ID in `wrangler.toml`.
2. Create the R2 bucket `nexus-audio-outputs`. Configure an R2 lifecycle rule to expire generated objects after 1 day.
3. Set secrets:
   - `wrangler secret put NEXUS_AUDIO_WORKER_TOKEN`
   - `wrangler secret put ELEVENLABS_API_KEY`
   - `wrangler secret put STABILITY_API_KEY`
   - `wrangler secret put DISBAND_KEY`
   - `wrangler secret put ELEVENLABS_DEFAULT_VOICE_ID` (required for voice generation unless a voice ID is passed per request)
4. Deploy with `wrangler deploy`.
5. Configure the app server's secret environment variables:
   - `NEXUS_AUDIO_ENGINE_URL=https://YOUR-AUDIO-WORKER.workers.dev`
   - `NEXUS_AUDIO_ENGINE_TOKEN` (same value as the worker token)
   - Keep these server-side only.

Provider keys are optional individually. The worker health endpoint reports which are configured. A missing provider fails clearly and does not pretend to generate audio.

## Job protocol

- `POST /jobs` with `{engine:"audio", prompt, options:{provider, task, duration, instrumental}}`.
- `GET /jobs/:id` returns the normalized NEXUS job and advances async Stable Audio or Disband status checks.
- Generated output is stored in R2. The worker returns an opaque asset ID; the app downloads it through the authenticated `/api/audio-assets?id=...` server proxy. Browser clients never receive the worker token.
- `POST /separations` accepts multipart form data with `file` and comma-separated `stems`; `GET /jobs/:id` returns all completed stem assets.
- Generation provider values: `elevenlabs` or `stable-audio`. Disband requires an uploaded source audio file and uses the separate separation route.

## Important limitations and cost controls

- ElevenLabs supports voice, music and sound-effects tasks. Voice generation needs a valid voice ID. Music API access is paid-plan gated.
- Stable Audio 3 text-to-audio returns an async job ID; NEXUS polls its result endpoint and stores the final audio in R2.
- Disband source uploads are limited to 100 MB in this flow. The primary vocal stem is placed on the timeline; the other requested stems are imported into the media library.
- Stable Audio starts with 25 free credits on new accounts; generation consumes credits. Disband offers 200 free credits daily, then paid credits. ElevenLabs API usage depends on plan and endpoint.
- Do not use an asset commercially unless its source or generated output licence covers the intended project and distribution. Keep attribution for Commons assets.
- NEXUS does not purchase credits or manage billing. Remote providers run only when the user approves the relevant AI media checklist item. Keep provider keys unset to use Wikimedia Commons and the local offline engine.
