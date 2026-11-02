# Batch 4 — export and generation integration

## Delivered in the repository
- HTTPS-only worker job proxy with private bearer-token forwarding, normalized job states, bounded progress and validated HTTPS output URLs.
- Generated image, video and audio output imports are checked against their expected MIME family; video/audio metadata is probed before adding to the correct timeline track.
- Import failures release the duplicate guard and revoke temporary object URLs; failed imports leave the project unchanged.
- Browser export prefers a native MP4 MediaRecorder format only when the current browser reports support; otherwise it falls back to WebM. The download extension follows the actual recorded MIME type.
- Export validation includes missing media/timing checks, resolution/memory guardrails, media seeking and audio capability checks.
- Embedded video audio now follows clip mute, track mute/hidden, gain and fade settings during export, matching audio-only clips.
- GitHub Actions workflow runs TypeScript and Vite production build on pushes and pull requests to main.

## Still required before Batch 4 can be declared complete
1. Start the experimental image notebook in a real GPU runtime, configure its HTTPS tunnel URL and token as Vercel server-side environment variables, then submit, poll, download and import a real image.
2. Build and deploy an independent video-generation worker using an actual video model/runtime. Do not label still-image output as video.
3. Build and deploy an independent audio/voiceover worker using an actual audio model/runtime.
4. Add a deterministic MP4 encoder/muxer for browsers without native MP4 MediaRecorder support. The current fallback is WebM, not a hidden MP4 conversion.
5. Test export duration, frame rate, audio/video sync, generated assets, long timelines and memory behavior on supported Android and desktop browsers.
6. Add durable job persistence, expiration/cleanup and retry behavior.

## External setup boundary
The repository cannot create a GPU session, keep a temporary notebook online, or provision Vercel environment secrets by itself. The worker URL and token must be created in the GPU runtime and configured privately in Vercel. Never commit or paste worker tokens into source control or chat.

## Release gates
A worker is operational only after a real request, poll, output download and timeline import pass. Native MP4 is available only when the browser advertises a compatible MediaRecorder format; otherwise NEXUS saves WebM until a dedicated MP4 muxer is integrated and tested. A GitHub push is not proof of a passing build or a production deployment.


## Batch 5 starter work
- Added editor keyboard shortcuts: Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y to redo, and Delete/Backspace to remove the selected clip. Shortcuts are suppressed while typing in form fields or editable content.
- This is a first usability/accessibility pass, not the complete Batch 5 release.
