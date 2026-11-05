# NEXUS Editor — Builds 1–5 completion record

This record separates repository-level completion from device-specific runtime certification. It does not claim that a browser build proves every media codec or AI model works on every Android device.

## Build 1 — Core Editor Foundation

**Repository scope:** complete and regression-covered.

- Existing editor, project format, timeline, media references, overlays, speed curves, preview and recovery remain in place.
- Project import now rejects malformed media, missing clip/track references, invalid overlay timing, duplicate IDs and image layers whose source is not an image.
- Older schema-v1 projects without overlay arrays remain importable; missing arrays are normalised to empty arrays.
- Regression coverage exercises project round-tripping, malformed project rejection and fixed/ramped speed conversions.

**Runtime boundary:** actual media decoding, browser codec support, long-timeline memory use and touch interactions still require device/browser testing.

## Build 2 — NEXUS Creative Fabric

**Repository scope:** complete and regression-covered.

- World Map, Project DNA, Intent Planner, What-if Studio and Continuity Guardian are present.
- Relationship mapping, scene intelligence, project memory and reviewable operations are connected to the editor.
- The user must approve proposed timeline operations; changes remain undoable.
- Regression coverage exercises scene roles, risk detection, recommendations, director briefs and local memory.

## Build 3 — AI Director

**Repository scope:** integrated with the editor and Creative Fabric.

- Director requests carry project DNA, scene context, confidence, risks, visual evidence and timeline timing candidates.
- The server validates the brief, bounds supplied context and keeps provider credentials server-side.
- The Director is instructed to distinguish supported editor operations from jobs requiring configured external workers.
- The Android and web builds compile with the current integration.

**Runtime boundary:** a successful provider response still depends on a valid server-side AI provider configuration. No paid key or external worker is provisioned by repository code.

## Build 4 — Prompt Understander

**Repository scope:** integrated and regression-covered.

- Original prompt, deliverable, style signals, explicit constraints, preserve/avoid instructions, reference intent and ambiguities are separated.
- The Director is instructed to preserve the original brief and disclose inferred choices.
- Regression coverage checks constraint and preserve/avoid extraction.

## Build 5 — Reference Intelligence and Fusion

**Repository scope:** integrated and regression-covered.

- Image, video, audio and document references are assigned roles.
- Multi-reference fusion keeps style, structure, content, replacement media, audio and text in separate lanes.
- The Director receives evidence availability, limitations and source-specific synthesis rules.
- Text references are extracted only from the supported text formats; extracted content is treated as untrusted source material.
- Sparse video frames and audio measurements are not represented as complete semantic understanding.

**Runtime boundary:** PDF/DOCX content extraction, full-motion video understanding, semantic audio/music understanding and low-memory Android vision-model execution are not certified by this build.

## Verification

The GitHub CI workflow runs regression tests, JavaScript syntax checks, TypeScript type-checking and the Vite production build. The Android workflow separately builds and uploads a debug APK. The current CI and Android APK workflow passed on commit `ffa9802d4e2195395fbd35f8d0f94f1f53b8e63f`; the expanded regression suite introduced with this completion pass must pass before this record is treated as final.

## Not included in the Builds 1–5 completion claim

- Semantic Intelligence Engine completion (Build 6).
- Full device certification on every Android/browser combination.
- External AI provider, GPU worker or model-host provisioning.
- PDF/DOCX extraction and unsupported reference-format decoding.
- Production export/worker guarantees described in `BATCH_4_EXPORT_ROADMAP.md`.
