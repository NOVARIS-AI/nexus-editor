# NEXUS internal media-engine tools

These tools are registered for the existing NEXUS AI Director. They are internal execution capabilities and must not be shown as user-facing controls.

## Tool routing

- **Remotion**: React-based scene composition and deterministic video rendering.
- **HyperFrames**: animated typography and motion-graphics composition.
- **FFmpeg**: media extraction, trimming, concatenation, transcoding, muxing and export preparation.
- **Whisper**: speech transcription and timestamped segments. This uses the existing online-first transcription endpoint and on-device Whisper Tiny fallback; it does not require a second worker.
- **yt-dlp**: metadata/reference-media retrieval only for media the user owns or is explicitly authorized to download. Do not bypass DRM, paywalls, access controls or platform restrictions.

The AI Director may return a small `engineTasks` array when an actual user request needs an internal operation. The client submits those tasks through `/api/engine-jobs`. Advice-only requests should return no tasks.

## Worker configuration

Set these server-only environment variables to enable remote execution:

- `NEXUS_REMOTION_ENGINE_URL` / `NEXUS_REMOTION_ENGINE_TOKEN`
- `NEXUS_HYPERFRAMES_ENGINE_URL` / `NEXUS_HYPERFRAMES_ENGINE_TOKEN`
- `NEXUS_FFMPEG_ENGINE_URL` / `NEXUS_FFMPEG_ENGINE_TOKEN`
- `NEXUS_YTDLP_ENGINE_URL` / `NEXUS_YTDLP_ENGINE_TOKEN`

Do not expose tokens through `VITE_*` variables or the browser.

## Worker contract

Each configured worker must expose:

- `POST /jobs` with JSON `{ "engine": "...", "prompt": "...", "options": {} }`
- `GET /jobs/:id` returning `{ "id": "...", "state": "queued|running|succeeded|failed|cancelled", "progress": 0, "message": "...", "output": { "url": "https://..." } }`

Output URLs must use HTTPS. The API validates job state and output URL before returning it to the app.

## Important deployment note

Registering a tool makes it available to the existing AI Director, but a remote engine is only executable when its worker URL and token are configured and the worker implements the contract above. Without that worker, NEXUS keeps its existing browser/native fallback and reports the internal operation as unavailable rather than pretending it ran.
