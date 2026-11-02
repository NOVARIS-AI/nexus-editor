# NEXUS EDITOR — Foundation Build

Original non-destructive video-editing foundation, not the completed professional editor.

## Included
- React + TypeScript + Vite application shell
- Video, audio and image import and preview
- Separate video, overlay and audio timeline lanes
- Add media to timeline, select clips, trim source in/out, move clip start
- Split and delete clips; seek playhead
- Save and reopen .nexusproj edit metadata
- Basic selected-video WebM export where browser MediaRecorder supports it
- Responsive workspace

## Current limitations
Export currently handles only the selected video clip, not a complete multi-track composition. Browser export is WebM and codec-dependent. Project files store edit instructions and asset metadata, not original media; re-import source media after reopening. Advanced effects, keyframes, transitions, colour grading, audio mixing, native Android rendering, Windows packaging and full multi-track export are not implemented yet.

## Run
Node.js 20+ recommended:
```sh
npm install
npm run dev
```
Production build: `npm run build`.

## Architecture direction
Use a shared versioned edit model with platform-specific render adapters: WebCodecs and a mux/demux layer on web, Media3 Transformer/MediaCodec on Android, and a carefully audited FFmpeg pipeline in a Windows desktop shell.

The .nexusproj format is JSON-based (schemaVersion 1) and stores project settings, asset metadata, tracks and clip instructions. Original media remains untouched.

## Deployment
The `main` branch is linked to the Vercel project `nexus_editor`. A documentation-only commit can be used to verify the Git-connected deployment trigger without changing application code.

## NEXUS managed generation workers

The AI storyboard stays inside the editor. Each scene exposes **Generate image** and **Generate video** actions. These submit a server-side job to the NEXUS worker gateway; the editor can refresh real job state and imports a successful HTTPS output as a generated project asset and timeline clip.

Configure the Vercel project environment variables:
- `NEXUS_IMAGE_ENGINE_URL` and `NEXUS_IMAGE_ENGINE_TOKEN`
- `NEXUS_VIDEO_ENGINE_URL` and `NEXUS_VIDEO_ENGINE_TOKEN`

The URLs must point to NEXUS-controlled worker services, not browser-facing model credentials. Keep tokens server-side. The worker API contract is:
- `POST /jobs` with JSON `{ "engine": "image" | "video", "prompt": "...", "options": { ... } }` and `Authorization: Bearer <token>`. Return HTTP 202 and a JSON job object: `{ "id": "...", "engine": "image" | "video", "state": "queued", "progress": 0, "message": "Queued" }`.
- `GET /jobs/{id}` with the same authorization. Return the same job shape; on success include `output: { "url": "https://...", "mimeType": "image/png" | "video/mp4" }`. The output URL must be HTTPS and allow browser download (CORS).
- Job states: `queued`, `running`, `succeeded`, `failed`, `cancelled`. Progress is a number from 0 to 100.

The editor includes honest disabled-worker handling: if a worker URL/token is absent, it reports that generation is not configured and leaves the project unchanged. This repository does not contain model weights or a GPU runtime. A NEXUS-owned GPU host and licensed model/workflow must be provisioned before generation can run; Vercel Functions proxy jobs and should not run large diffusion/video models themselves.
