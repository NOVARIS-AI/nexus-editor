# NEXUS Studio — Internal AI implementation and QA register

**Audience:** product engineering, QA, privacy review and release owners.  
**Visibility:** internal documentation only. Do not surface this register, model identifiers, provider names, inference routes, runtime details or diagnostic metrics in the customer-facing editor.

## Customer-facing feature names

| Customer feature | What the customer sees |
|---|---|
| AI Director | Creative planning, editing guidance and approved edit actions |
| Smart Search | Search scenes, captions and project material by meaning |
| Scene Understanding | Scene descriptions and visual context from sampled footage |
| Message-aware Editing | Suggestions for captions, cuts, transitions and pacing |
| Creative Fabric | Project-wide creative context, style, media relationships and suggestions |
| Quote Design | Editable quote/poster compositions |
| Creator SEO | Platform-aware metadata and publishing guidance |

The editor must describe capabilities in plain language. It must not expose internal model names, model sizes, vendor/provider labels, embedding/vector terminology, runtimes, device-memory diagnostics, raw worker routes, or internal fallback names.

## Internal implementation inventory

- Semantic retrieval currently uses the local semantic-brain implementation and a keyword-related fallback. The semantic model may need a first-use download and browser storage.
- Visual scene understanding uses the configured Transformers.js/ONNX browser path with SmolVLM2-256M-Video-Instruct. It is optional and requires a compatible browser/device; sample-based analysis is not a complete video review.
- AI Director can use the configured server-side brain; local guidance and editing rules remain available when that service is not configured.
- Image/video/audio creation routes are capability-gated. Image-to-editable-motion is not equivalent to generative video. Procedural audio is not a full music or vocal generation service.
- Timeline, preview, project recovery, editing operations and browser export should remain usable when optional AI features are unavailable.

## Release QA checklist

### Customer experience
- [ ] No model, vendor, runtime, vector, embedding, WebGPU, ONNX, WASM or inference-route details appear in normal screens, tooltips, errors or accessibility labels.
- [ ] Feature names remain consistent across Home, Editor, Creative, AI Director, Settings, onboarding and help.
- [ ] Errors explain what the customer can do next without exposing stack traces or provider internals.
- [ ] Creative and AI Director panels are reachable from the editor and do not cover essential timeline controls.
- [ ] The preview occupies the dominant upper workspace; timeline and tool dock remain visible and usable.
- [ ] Glass panels preserve contrast and readable text; transparency never reduces control legibility.
- [ ] Verify 320px, 360px, 390px, 412px and tablet/desktop widths, portrait and landscape, and Android safe-area insets.

### Functional regression
- [ ] Import images, videos and audio from gallery/files.
- [ ] Preview, seek, play/pause, trim, split, move, reorder, mute and adjust clips.
- [ ] Add/edit text, captions, quote compositions, overlays and stickers.
- [ ] Apply filters, effects, transitions, keyframes, speed changes and audio controls.
- [ ] AI Director understands the request and reference materials, presents a reviewable plan, and requires approval before applying project changes.
- [ ] Smart Search degrades gracefully when the optional semantic feature is not prepared.
- [ ] Scene Understanding handles unsupported devices and failed downloads without blocking editing.
- [ ] Message-aware suggestions are clearly presented as suggestions, not guaranteed detections.
- [ ] Undo/redo, autosave/recovery, project import/export and final rendering remain intact.
- [ ] Creator SEO outputs can be edited and copied; no ranking guarantees are claimed.

### Privacy and disclosure review
- [ ] Confirm which processing is local and which requests leave the device before release.
- [ ] Document any external AI service, data categories, retention and user controls in the Privacy Policy/Terms where applicable.
- [ ] Do not claim that all AI processing is on-device unless verified for every feature and configuration.
- [ ] Do not claim real-time video generation or guaranteed scene/beat detection where the implementation is sample-based or heuristic.
- [ ] Keep secrets server-side; never bundle provider credentials in the web or Android client.

## Definition of done
A build is not complete merely because the visual layer compiles. It must pass the functional regression checklist on supported desktop and Android devices, with particular attention to lower-memory Android hardware. Record actual test device, browser, feature availability and failures in the release QA report.
