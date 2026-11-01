# NEXUS EDITOR — Engine Architecture & Product Roadmap

Status: architecture proposal for next implementation phase.
Principle: build an original non-destructive editor with a shared project model and platform-specific renderers.

## 1. Product direction

Combine CapCut's direct manipulation and contextual tool docks; VN's frame-accurate timeline, zoom, speed curves and non-destructive drafts; KineMaster's independent layers, blend modes, chroma key and audio envelopes; Premiere's masking, tracking, speech-to-text, colour and audio workflow; and LumaFusion's deeper mixing, scopes, LUTs, keyframes and compositing. These are feature references, not branding or asset templates.

## 2. Audit of the current repository

The main branch is a small React + TypeScript + Vite foundation, not a complete editing engine.

Present: local video/image/audio import; object URL preview; basic media metadata; simple clip placement, selection, split and delete; playhead; JSON project metadata; responsive shell.

Major gaps:
- TimelineClip only has assetId, trackId, start, sourceIn, sourceOut and label. It cannot represent transforms, speed curves, effects, keyframes, masks, transitions, captions or audio automation.
- Track definitions are static defaults; track order, lock, visibility, mute, solo, track type and routing need a real model.
- Text is one React preview overlay, not a timed text clip saved on the timeline.
- Preview displays the selected source asset, not the complete composition at the playhead.
- Audio has no waveform, mixer, gain envelope, fade, pan, EQ, ducking or synchronised multi-track engine.
- Most footer tools are placeholders; their controls do not yet write to a project model or render.
- Project open restores clip metadata but does not robustly relink original assets.
- Export does not render the complete multi-track composition.
- Recent-project cards, templates and AI Studio cards are hard-coded examples/placeholders.
- No automated editing-engine tests, codec capability checks, render queue or crash recovery are present.

## 3. Target architecture

Keep React as the UI client. UI controls issue typed commands; they must not implement rendering or mutate project data independently.

Suggested structure:

src/app — workspace shell and routing
src/editor/model — versioned project, tracks, clips, generators, effects and keyframes
src/editor/commands — typed undoable commands
src/editor/state — reducer/store, selection, playhead and history
src/editor/timeline — snapping, zoom, trim, split, ripple and drag/drop
src/editor/preview — composition graph, preview scheduler and overlay hit-testing
src/editor/tools — tool definitions and contextual panels
src/media/ingest — import, metadata, thumbnails and waveforms
src/media/assets — asset registry, cache and relinking
src/media/codecs — capability detection
src/render/contracts — shared render request/progress/result contracts
src/render/web — WebCodecs and mux/demux adapter
src/render/android — future Media3 adapter
src/render/desktop — future Windows renderer adapter
src/audio — mixer graph and audio automation
src/persistence — schema validation, migrations, autosave and recovery

Core separation:
1. Project model is the source of truth.
2. Command layer applies edits and records undo/redo.
3. Preview compositor evaluates the project at a timestamp.
4. Render adapter exports the same model.
5. UI tools read values and dispatch commands.
6. Persistence validates, migrates and saves edit instructions separately from source media.

## 4. Versioned project model

Introduce schema v2 and retain a tested migration from v1. Do not silently discard old project fields.

Project: id, name, schemaVersion, canvas dimensions, frame rate, timebase, colour space, audio sample rate and timestamps.
Assets: stable id, filename, kind, MIME type, duration, dimensions, rotation, codec metadata, fingerprint and optional proxy/thumbnail/waveform references.
Tracks: id, type (video/audio/text/graphics/captions/effects), order, name, mute, solo, hidden, locked, gain and compositing mode.
Clips: id, asset reference, track reference, timeline start/duration, source in/out, speed curve, transform, crop, opacity, audio gain/pan and enabled state.
Generators: text, shapes, solid/gradient backgrounds and adjustment layers.
Effects: typed IDs, parameters, enabled state, ordering, blend/composite settings and masks.
Keyframes: property path, time, value, interpolation and easing.
Transitions: clip boundary, duration, type and parameters.
Captions: timed segments, text, style, language and speaker metadata.
Metadata: markers, beat markers, safe guides, proxy settings and export defaults.

Use integer frame/tick positions or rational timebases as authoritative timeline time. Convert to seconds only at media API/UI boundaries. Project files reference source assets; they do not embed original media. Provide missing-file detection and relinking using stable IDs/fingerprints.

## 5. Tool operation contract

Every tool follows the same loop: choose tool; select/create target; show actual model values; dispatch an undoable command; recompose preview; update timeline; save edit instructions; export using the same instructions.

Never show a slider or button as applied when it does not affect the model, preview and export. Unimplemented operations must be clearly disabled or marked as planned.

Edit: select, trim, split, ripple delete, duplicate, reorder, freeze, reverse, speed presets and speed curves.
Audio: music/SFX, extract source audio, voiceover, waveform, gain, fade, pan, ducking, EQ and noise reduction.
Text: timed text clips, direct preview editing, fonts, size, weight, colour, stroke, shadow, alignment, line spacing, animation and duration.
Overlay: media layers, transform handles, crop, masks, opacity, blend modes and corner pin.
Effects: clip effects, adjustment layers, transitions, effect stacks and keyframeable parameters.
Captions: speech-to-text, manual subtitles, segment editing, speaker labels, styles and subtitle export.
Filters: non-destructive stack, intensity and LUT import.
Adjust: exposure, brightness, contrast, saturation, temperature, tint, HSL, curves and scopes.
Media: library, search, favourites, bins, thumbnails, relink and import.
Stickers/graphics: raster/vector/animated assets, transform, timing and keyframes.
Background: colour, gradient, blur, image/video and fill/fit modes.
Ratio/canvas: aspect ratio, resolution, frame rate and safe areas.

## 6. Preview and export

Preview must evaluate active clips on every track at the playhead, resolve source timestamps, apply transforms/crop/masks/effects in deterministic order, composite layers, and mix active audio tracks. Preview quality may adapt to device capability and use proxies.

Export builds a render plan from the same composition graph. Validate missing media, unsupported effects/codecs, output settings and free storage first. Run a cancellable job with progress and useful errors. Write to a temporary file, verify it, then move/copy to the destination. Never report Saved/Done until the output file exists and has been verified.

## 7. Platform strategy

Web: retain Vite/React and shared model. Use WebCodecs only after capability checks. WebCodecs handles low-level encoding/decoding but does not provide container demuxing/muxing; use a separately audited mux/demux library. Provide a tested fallback for browsers without required support. Use workers and release decoded frames, buffers and object URLs.

Android: use Kotlin + Jetpack Media3 Transformer/Effect + MediaCodec/OpenGL for native media processing. Keep the React UI if the bridge remains suitable, but pass validated project/render requests to a native plugin. Add Android file picker/SAF, persistent URI permissions, cache/proxy management, export destination and foreground export notifications. Test low-memory devices.

Windows: use a desktop shell and native render adapter. Choose Media Foundation or FFmpeg after codec, feature and licensing review. If FFmpeg is selected, pin build configuration, audit enabled libraries/codecs and ship required notices/source materials; do not accidentally enable GPL/nonfree components.

## 8. Phased implementation and acceptance gates

Phase 0 — Stabilise foundation: build checks; unit tests for model/split/trim/duration/save/load; v1-to-v2 migration; project relink; local persistence; metadata, thumbnail and waveform extraction; codec capability detection; replace fake recent-project data.
Gate: import/add/select/split/delete/save/reopen pass tests without losing metadata.

Phase 1 — Command and timeline engine: typed commands/reducer; undo/redo; autosave/recovery; multi-track add/move/trim/ripple/duplicate; snapping, zoom and frame-accurate playhead.
Gate: each basic edit is undoable, saved and restored consistently.

Phase 2 — Composition preview: video/image clips, text and shape generators, transforms, opacity, crop, layer order and basic transitions; preview hit-testing and transform handles.
Gate: multi-layer preview matches fixture expectations and survives save/reopen.

Phase 3 — Audio engine: tracks, waveform cache, gain, mute/solo, fades, pan, volume automation, voiceover and basic mixer.
Gate: synchronised multi-track audio preview and export tests pass.

Phase 4 — Core export: render queue, cancellation, progress, validation and verified output. Start with one reliable codec/container path.
Gate: output plays on target devices and matches duration, dimensions, frame rate and audio sync.

Phase 5 — Creative tools: colour/filter stack, effects, masks/chroma key, keyframes/curves, speed ramps, transitions, captions, stickers and motion titles. Every feature must support UI, model, preview, export, save/reopen and undo/redo.

Phase 6 — AI/advanced: transcription, TTS, audio cleanup, subject tracking, background removal, scene/beat detection and semantic media search. AI remains optional; ordinary editing stays possible offline. Add proxies, bins, markers, multicam, scopes, LUTs, HDR and advanced compositing as separate milestones.

Phase 7 — Platform completion: Android native renderer/storage workflow; Windows packaging/renderer; cross-platform project interoperability.

## 9. Quality and test matrix

Test portrait/landscape, variable frame rate, rotation metadata, silent video, audio-only, still images, mixed sources, long clips, large images, multiple layers, missing assets, codec differences, export interruption, low storage, low-memory Android, project migration and autosave recovery.

Invariants: source media is never modified; edits are deterministic/non-destructive; preview and export share model/effect ordering; undo/redo restores exact prior state; save/reopen does not silently drop fields; unsupported operations are visibly unavailable.

## 10. Reference product lessons

CapCut: direct manipulation and approachable contextual controls.
VN: precise timeline trimming, zoom, beat editing, speed curves and non-destructive drafts.
KineMaster: independent layers, transforms, blend modes, chroma key and audio envelopes.
Premiere: structured editing, masking/tracking, speech-to-text, colour and audio tools.
LumaFusion: advanced audio mixing, colour scopes/LUTs, keyframes and multilayer titles.

## 11. Technical references

- Android Media3 editing guide: https://developer.android.com/media/implement/editing-app
- Android Media3 Transformer: https://developer.android.com/media/media3/transformer
- MDN WebCodecs: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
- MDN WebCodecs mux/demux concepts: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Video_processing_concepts
- FFmpeg licensing: https://ffmpeg.org/legal.html
- KineMaster features: https://kinemaster.com/features
- KineMaster multilayer editing: https://kinemaster.com/features/multi-layer
- VN editing guide: https://vlognow.me/help/getting-started/editing-101/
- Adobe Premiere features: https://www.adobe.com/products/premiere/features.html
- LumaFusion features: https://apps.apple.com/us/app/lumafusion/id1062022008