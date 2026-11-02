# Batch 4 — export and generation integration

This phase starts with reliability and truthful capability reporting before adding expensive codecs or model runtimes.

## Implemented foundation
- Worker job proxy with HTTPS-only worker endpoints and output URLs.
- Normalized job states and progress; invalid worker responses fail visibly instead of being treated as completed.
- Generated image/video downloads are checked against the expected MIME family before timeline import.
- Worker protocol and environment setup documented in [GENERATION_WORKER_CONTRACT.md](./GENERATION_WORKER_CONTRACT.md).

## Remaining work
1. Connect and test the experimental image worker with a real GPU session and verify the output can be imported.
2. Add an independently deployable video worker; do not reuse an image pipeline or label still images as video.
3. Add audio generation only with an actual audio model/runtime and audio-specific output validation.
4. Add a deterministic export pipeline with a supported MP4 muxer, memory-aware resolution limits and device/browser tests.
5. Add export presets and validate audio/video sync, duration, frame rate and output metadata.
6. Add resumable job persistence and cleanup for expired outputs.

## Release gates
- A worker is operational only after a real request, poll, output download and timeline import pass.
- MP4 is not available until the encoder and muxer are integrated and tested. Current browser export is WebM.
- Do not expose provider tokens in frontend code or repository history.
