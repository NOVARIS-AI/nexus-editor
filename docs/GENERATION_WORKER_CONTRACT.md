# NEXUS generation worker contract (v1)

NEXUS Editor talks to private generation workers only through the Vercel API routes. Never put worker URLs or bearer tokens in browser code.

## Environment variables

Configure each worker pair in the Vercel project settings:

- `NEXUS_IMAGE_ENGINE_URL` / `NEXUS_IMAGE_ENGINE_TOKEN`
- `NEXUS_VIDEO_ENGINE_URL` / `NEXUS_VIDEO_ENGINE_TOKEN`
- `NEXUS_AUDIO_ENGINE_URL` / `NEXUS_AUDIO_ENGINE_TOKEN`
- `NEXUS_RENDER_ENGINE_URL` / `NEXUS_RENDER_ENGINE_TOKEN`

Worker base URLs must use HTTPS. Tokens are sent only from the server to the worker in an Authorization bearer header. Do not commit tokens or paste them into chat.

## Required routes

### Submit: `POST {BASE_URL}/jobs`

Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`.

Request:
```json
{
  "engine": "image",
  "prompt": "A cinematic sunrise over a quiet coastline",
  "options": { "duration": 5, "aspectRatio": "9:16", "style": "cinematic" }
}
```

Return HTTP 200 or 202 with:
```json
{
  "id": "job_123",
  "state": "queued",
  "progress": 0,
  "message": "Waiting for a worker"
}
```

### Poll: `GET {BASE_URL}/jobs/{id}`

Return HTTP 200:
```json
{
  "id": "job_123",
  "state": "running",
  "progress": 45,
  "message": "Rendering"
}
```

Allowed states: `queued`, `running`, `succeeded`, `failed`, `cancelled`. Progress is a number from 0 to 100. A successful image/video job should include:
```json
{
  "id": "job_123",
  "state": "succeeded",
  "progress": 100,
  "message": "Complete",
  "output": {
    "url": "https://worker.example/output/job_123.mp4",
    "mimeType": "video/mp4",
    "assetId": "asset_123"
  }
}
```

Output URLs must be public or signed HTTPS URLs reachable by the user's browser. The browser checks the downloaded MIME type before importing it. Keep signed URLs valid long enough for the user to import the result. Return an `error` string for failed jobs.

## Operational requirements

- Authenticate every request and rate-limit job creation.
- Enforce prompt, duration, resolution and file-size limits on the worker.
- Do not trust user-supplied output URLs or options.
- Use durable job IDs and persist job state outside the worker process when possible.
- Return JSON errors with a short `error` field and meaningful HTTP status.
- Provide CORS access for the NEXUS app origin on output downloads, or use a controlled download proxy.
- Do not report success until the output is fully written and readable.
- Image, video, audio and render are separate capabilities. An image worker must not advertise video or audio support.

## Current limitations

The Vercel API proxy validates HTTPS worker endpoints, job state, progress and output URLs. It does not itself create media. A worker must be deployed, configured in Vercel, and tested with a real job before its engine can be called operational. The free GPU notebook is an optional experimental image worker; its runtime and public URL are temporary.
