# NEXUS Editor — Builds 6–8 implementation record

This record describes repository implementation and automated coverage. It does not certify that optional AI models run on every device or that transcript/beat timestamps are exact.

## Build 6 — Semantic Intelligence Engine

- The existing MiniLM L6 quantised embedding model remains the local meaning-search engine.
- Embeddings are now cached in IndexedDB across sessions, with an in-memory fallback when browser storage is unavailable.
- The cache is versioned for the model and bounded; old entries are pruned when the cache grows beyond its limit.
- Semantic search still includes the existing keyword fallback. The embedding model is optional and requires a first download.
- The search corpus includes scene notes, editable text, transcript segments, visual descriptions and media metadata. It does not infer speech or visual content that has not been analysed.

## Build 7 — Visual Intelligence

- Added a visual evidence map that links SmolVLM2 frame descriptions and local frame measurements to timeline scenes.
- Each scene is labelled model-described, frame-sampled, metrics-only or not-sampled, with an explicit confidence level.
- The map carries supported frame descriptions and composition observations into the AI Director context.
- Sparse frame sampling is not represented as full-motion understanding or exact cut detection.
- SmolVLM2 remains optional and needs compatible WebGPU hardware/browser, storage and memory. Low-memory devices can use local frame measurements without the vision model.

## Build 8 — Message-Aware Editing

- Added an evidence-led planner that maps available transcript segments to editable caption layers.
- Transcript gaps can suggest a cut point when a fixed-speed visual clip covers the source timestamp; clips with speed curves are excluded from automatic split suggestions.
- Audio transient markers are mapped from source-audio time through the audio clip onto the project timeline, then matched to visual scenes for beat-aware transition suggestions.
- Scene notes can suggest a message-matched visual treatment.
- Every recommendation is reviewable individually. Applying a caption, split, transition or look is an explicit user action and remains covered by the editor's undo history.
- Transcript gaps and detected transients are candidates, not proof of silence or musical downbeats. Preview and listen before applying.

## Verification boundaries

The added regression tests cover vector similarity, visual evidence mapping, unobserved-scene confidence, transcript caption planning, pause-cut planning and source-to-timeline beat mapping. GitHub CI, TypeScript and production build results must pass on the resulting commit before these builds are marked repository-verified.

No Vercel deployment is part of this implementation pass. No paid model/API key or external worker is provisioned by these changes.
