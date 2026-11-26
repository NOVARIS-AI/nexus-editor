# NEXUS AI Director — production release checklist

This checklist covers the production executor, Creative Review, editable timeline hand-off, final rendering and Cloudflare release. It deliberately separates source-code readiness from a deployed provider: a configured URL is not proof that a provider can return a valid media file.

## Stage 5 — Production Executor

- [ ] Approve a storyboard and confirm each scene is checkpointed before work starts.
- [ ] Confirm scenes run in storyboard order and a failed scene does not erase completed outputs.
- [ ] Pause during a local scene and confirm the current scene finishes before the pause is saved.
- [ ] Resume and confirm completed scenes are not generated again.
- [ ] Restart the Android app during a local scene; confirm it is marked interrupted and can be retried.
- [ ] Restart with a remote job ID saved; confirm the job remains pollable and is not falsely marked complete.
- [ ] Confirm a worker success without a secure output URL is rejected.

## Stage 6 — Creative Review Studio

- [ ] Inspect image, video and audio previews on a phone.
- [ ] Edit visual direction and narration; confirm the scene is marked as needing changes.
- [ ] Save reviewer notes and regenerate only the selected scene.
- [ ] Approve each completed scene; confirm the draft cannot be completed while any completed scene is awaiting review.
- [ ] Reorder scenes and confirm the corresponding timeline scene clips move with them.

## Stage 7 — Editable Project Builder

- [ ] Confirm video and image outputs become editable visual clips.
- [ ] Confirm titles remain editable text layers.
- [ ] Confirm music and narration remain editable audio clips.
- [ ] Confirm sourced media retains its source page, licence, creator and attribution.
- [ ] Confirm generated media is stored in the project media library and project backup.
- [ ] Reopen a saved project and verify media relinking/preview on Android.

## Stage 8 — Render and quality verification

- [ ] Run project verification and resolve all error-severity findings.
- [ ] Review warnings for timeline gaps, missing media, small/short text and high render load.
- [ ] Test a short 720p/30 FPS render on the target Android phone first.
- [ ] Validate the resulting file is non-empty MP4 or WebM before saving.
- [ ] Test cancellation and a low-memory failure; confirm the editable project remains unchanged.
- [ ] Test longer and higher-resolution exports only after the short render succeeds.

The browser renderer is device-dependent. Elah acceleration is used only when the browser reports WebGL2, WebCodecs, Web Workers and OffscreenCanvas support; otherwise the supported renderer fallback is used. Do not describe this as guaranteed hardware acceleration on every Android WebView.

## Stage 9 — Cloudflare release and Android acceptance

1. Keep the feature branch and pull request separate from production until CI is green and the phone smoke tests above pass.
2. Confirm the GitHub Actions deployment token has the required Cloudflare permissions. The GitHub Actions token and the runtime Worker secrets are separate credentials.
3. Configure only encrypted Worker secrets in Cloudflare. Never add provider keys, service-role keys or Worker bearer tokens to browser-visible `VITE_*` variables or Git.
4. Verify `/api/health` and `/api/engine-status`; these report configuration, not proof of a successful media generation or render.
5. For the dedicated audio Worker, replace the KV namespace placeholder in `workers/audio/wrangler.toml`, create the `nexus-audio-outputs` R2 bucket, configure its one-day lifecycle, set the documented secrets, deploy it, and then configure the main Worker's `NEXUS_AUDIO_ENGINE_URL` and `NEXUS_AUDIO_ENGINE_TOKEN`.
6. Configure `NEXUS_VIDEO_ENGINE_URL` and `NEXUS_VIDEO_ENGINE_TOKEN` only when a real video-generation worker is available and tested. Flux image generation, Remotion, HyperFrames and FFmpeg are not interchangeable with prompt-to-video generation.
7. Verify Google/email authentication, media import, project save/restore, image generation, audio routing, video job polling and final export independently.
8. Deploy only after explicit release approval. A passing CI run alone is not permission to merge or deploy.

## Current integration limits

- Wikimedia Commons media is filtered to reusable licences (Public Domain, CC0, CC BY and CC BY-SA) with secure URLs and provenance. Non-commercial and no-derivatives material is excluded.
- If no genuine video-generation provider is configured, NEXUS can keep editable native scene placeholders, source suitable licensed media, or animate/composite assets. It must not claim a real prompt-to-video result.
- A production run reaching Creative Review means its scene assets/checkpoints are ready for human inspection; it does not mean a final video has already been rendered.
- This checklist is a release gate, not a report that every item has already passed on a physical Android device.
