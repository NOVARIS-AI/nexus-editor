# NEXUS internal media-engine tools

These tools are registered for the existing NEXUS AI Director. They are internal execution capabilities and must not be shown as user-facing controls.

## Tool routing

- **Remotion**: React-based scene composition and deterministic video rendering.
- **HyperFrames**: animated typography and motion-graphics composition.
- **FFmpeg**: media extraction, trimming, concatenation, transcoding, muxing and export preparation.
- **Whisper**: speech transcription and timestamped segments. This uses the existing online-first transcription endpoint and on-device Whisper Tiny fallback; it does not require a second worker.
- **yt-dlp**: metadata/reference-media retrieval only for media the user owns or is explicitly authorized to download. Do not bypass DRM, paywalls, access controls or platform restrictions.

The existing AI Director may return a small `engineTasks` array when an actual user request needs an internal operation. The client submits only the server-backed Remotion, HyperFrames, FFmpeg and authorized yt-dlp tasks through `/api/engine-jobs`, then tracks their job IDs in the shared background queue. Completed media is classified by the verified output MIME type before import; it is not classified by the tool name. Advice-only requests return no jobs.

Whisper is deliberately not a second remote job type. It uses the existing online-first Groq Whisper-compatible endpoint and device-aware on-device Whisper Tiny fallback through `transcribeMediaInternally`. The AI Director can use an existing transcript supplied in context, but it must not report Whisper as completed when no audio was actually processed.

The internal tool catalogue lives separately from the user-facing capability registry. These five implementation engines are not added as navigation items, visible tool cards, settings labels or separate AI identities. The user continues to interact with the existing NEXUS AI Director and sees the resulting editable project/media only.

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

Output URLs must use HTTPS. The API validates job state and output URL before returning it to the app. Remotion and HyperFrames outputs must resolve to video media; FFmpeg and yt-dlp may return audio or video media. The editor validates the returned MIME type and decodability before importing any output. yt-dlp is restricted to metadata/reference retrieval and media the user owns or is authorized to download.

## Important deployment note

Registering a tool makes it available to the existing AI Director, but a remote engine is only executable when its worker URL and token are configured and the worker implements the contract above. Without that worker, NEXUS keeps its existing browser/native fallback and reports the internal operation as unavailable rather than pretending it ran.
