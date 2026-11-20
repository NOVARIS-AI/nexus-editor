# NEXUS Editor Audio Engine

NEXUS uses a server-side Cloudflare audio router. Provider keys never belong in browser code, Vite variables, Git, or project files.

## Providers and responsibilities

- **ElevenLabs**: character dialogue, narration, voiceover, sound effects and music. Music API access is plan-gated; use Music v2.5.
- **Stable Audio 3**: prompt-to-music, ambience, loops and sound effects.
- **Disband**: stem separation for vocals, instrumental, drums, bass, guitar, piano and other supported stems. NEXUS uploads the selected source audio through the authenticated worker, polls the job, and imports returned stems into the media library.
- **Wikimedia Commons**: search reusable existing audio and retain creator/licence/attribution metadata.
- **NEXUS local engine**: offline procedural audio fallback.

## Cloudflare setup

From `workers/audio`:

1. Create a KV namespace and replace the placeholder namespace ID in `wrangler.toml`.
2. Create the R2 bucket `nexus-audio-outputs` and configure an R2 lifecycle rule to expire generated objects after 1 day.
3. Set secrets:
   - `wrangler secret put NEXUS_AUDIO_WORKER_TOKEN`
   - `wrangler secret put ELEVENLABS_API_KEY`
   - `wrangler secret put STABILITY_API_KEY`
   - `wrangler secret put DISBAND_KEY`
   - Optional: `wrangler secret put ELEVENLABS_DEFAULT_VOICE_ID`
4. Deploy with `wrangler deploy`.
5. Configure the app server's secret environment variables:
   - `NEXUS_AUDIO_ENGINE_URL=https://YOUR-AUDIO-WORKER.workers.dev`
   - `NEXUS_AUDIO_ENGINE_TOKEN` (same value as the worker token)
   - Keep these server-side only.

Provider keys are optional individually. The worker reports which are configured from its health endpoint. A missing provider fails clearly and does not pretend to generate audio.

## Job protocol

- `POST /jobs` with `{engine:"audio", prompt, options:{provider, task, duration, instrumental}}`.
- `GET /jobs/:id` returns the normalized NEXUS job.
- `GET /assets/:id` downloads generated audio from R2.
- Provider selection values: `elevenlabs` or `stable-audio` for generation. `disband` is reserved for the separate source-audio separation flow.

## Important limitations

- The current worker supports ElevenLabs voice, music and sound-effects generation, Stable Audio 3 generation, and Disband stem separation. Disband source uploads are limited to 100 MB; the primary stem is placed on the timeline and additional stems are imported into the media library.
- If Stable Audio is not configured, the router can fall back to ElevenLabs when its key is present. The actual provider used is recorded in job metadata.
- Do not use an asset commercially unless its source or generated output licence covers the intended project and distribution. Keep attribution for Commons assets.
- Provider usage may incur charges. NEXUS should only submit a paid generation after the user approves the relevant AI media checklist item.
