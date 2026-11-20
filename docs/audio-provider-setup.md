# NEXUS Editor Audio Engine

NEXUS uses a server-side Cloudflare audio router. Provider keys never belong in browser code, Vite variables, Git, or project files.

## Providers and responsibilities

- **ElevenLabs**: character dialogue, narration, voiceover, sound effects and music. Music API access is plan-gated; use Music v2.5.
- **Stable Audio 3**: prompt-to-music, ambience, loops and sound effects.
- **Disband**: selected as the planned stem-separation specialist (vocals, instrumental, drums, bass, guitar, piano). It is not wired into the current worker upload flow yet and is not advertised as available.
- **Wikimedia Commons**: search reusable existing audio and retain creator/licence/attribution metadata.
- **NEXUS local engine**: offline procedural audio fallback.

## Cloudflare setup

From `workers/audio`:

1. Create a KV namespace and replace the placeholder namespace ID in `wrangler.toml`.
2. Create the R2 bucket `nexus-audio-outputs`.
3. Set secrets:
   - `wrangler secret put NEXUS_AUDIO_WORKER_TOKEN`
   - `wrangler secret put ELEVENLABS_API_KEY`
   - `wrangler secret put STABILITY_API_KEY`
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

- The current worker generation route supports ElevenLabs voice, music and sound-effects generation, plus Stable Audio 3 generation. If Stable Audio is not configured, the router can fall back to ElevenLabs when its key is present.
- Disband is documented as the planned stem-separation specialist, but its authenticated source-file upload, polling and multi-stem timeline import are not implemented in this change. Do not treat it as connected yet.
- Do not use an asset commercially unless its source or generated output licence covers the intended project and distribution. Keep attribution for Commons assets.
- Provider usage may incur charges. NEXUS should only submit a paid generation after the user approves the relevant AI media checklist item.
