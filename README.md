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