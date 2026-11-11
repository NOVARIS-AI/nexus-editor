# NEXUS Media Engine Worker

A private Node.js 22 container that executes the existing NEXUS AI Director's hidden Remotion, HyperFrames, FFmpeg and yt-dlp tools. It is not a user-facing app.

## What runs here

- Remotion: builds a deterministic scene composition and renders MP4 with the Remotion renderer.
- HyperFrames: writes a seekable HTML motion-graphics composition and renders it with the HyperFrames CLI.
- FFmpeg: performs allowlisted media extraction, trimming and transcoding.
- yt-dlp: metadata lookup or media retrieval only after an explicit user-authorized flag and host allowlisting.
- Whisper remains in NEXUS's existing online-first/on-device speech pipeline; it is not duplicated in this service.

## Run with Docker

Build:

```sh
docker build -t nexus-media-engine ./workers/media-engine
```

Run with persistent storage and TLS reverse proxy in front:

```sh
docker run -d --name nexus-media-engine \
  -p 127.0.0.1:8787:8787 \
  -v nexus-engine-data:/data \
  -e NEXUS_ENGINE_WORKER_TOKEN='long-random-server-secret' \
  -e NEXUS_ENGINE_OUTPUT_SECRET='different-long-random-secret' \
  -e PUBLIC_BASE_URL='https://YOUR-ENGINE-HOST' \
  -e NEXUS_MEDIA_SOURCE_HOSTS='your-approved-storage-host.example' \
  -e NEXUS_YTDLP_ALLOWED_HOSTS='your-authorized-media-host.example' \
  nexus-media-engine
```

Do not expose port 8787 directly to the public internet. Put it behind HTTPS. Keep both secrets server-side. Do not set them as VITE variables.

## Connect NEXUS

Set these server-side NEXUS app environment variables to the same HTTPS base URL and worker token:

- `NEXUS_REMOTION_ENGINE_URL` and `NEXUS_REMOTION_ENGINE_TOKEN`
- `NEXUS_HYPERFRAMES_ENGINE_URL` and `NEXUS_HYPERFRAMES_ENGINE_TOKEN`
- `NEXUS_FFMPEG_ENGINE_URL` and `NEXUS_FFMPEG_ENGINE_TOKEN`
- `NEXUS_YTDLP_ENGINE_URL` and `NEXUS_YTDLP_ENGINE_TOKEN`

All four may point to the same service. The API forwards the engine ID in each job.

## API contract

- `GET /health` — health status.
- `POST /jobs` — authenticated JSON `{engine,prompt,options}`; returns `{id,state,progress,message}`.
- `GET /jobs/:id` — authenticated job status.
- `GET /outputs/:name?expires=...&sig=...` — time-limited signed output.

The job output URL is HTTPS and signed for 24 hours so NEXUS can import the resulting video/audio into its editable media library.

## Media inputs

FFmpeg accepts `options.inputUrl` only when its hostname is included in `NEXUS_MEDIA_SOURCE_HOSTS`. yt-dlp accepts `options.url` only when the host is in `NEXUS_YTDLP_ALLOWED_HOSTS` and `options.userAuthorized === true`. Private-network URLs, local addresses, redirects, and unlisted hosts are rejected. The worker does not use cookies or bypass DRM, paywalls or access controls.

## Important deployment boundary

The service source and Docker build recipe are now part of the repository. It still needs to be deployed to a machine/container host with persistent storage and HTTPS, then its server-only URL/token variables must be configured in the NEXUS app. Merely committing this folder does not make a remote runtime live.
