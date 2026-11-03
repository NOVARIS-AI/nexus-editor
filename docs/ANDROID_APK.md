# NEXUS Studio Android APK

NEXUS is a shared React editor with a Capacitor Android shell. The browser build remains available; the APK uses Android's native document picker and native file-save/share APIs where supported.

## Android-specific capabilities
- Native Android document picker for photos, videos, audio and general media, with the web file input retained as the browser fallback.
- Selected content is opened through the native picker URI and handed to the shared editing model as a browser-compatible File object.
- Export files are written to the app's Documents/NEXUS Exports folder and offered through Android's native share sheet.
- Capacitor native plugins are synced into the Android WebView during APK generation.

## Build an APK
The GitHub Actions workflow **NEXUS Android APK** builds a debug APK on pushes that affect the editor or by manual dispatch. Download the artifact named `nexus-studio-android-debug` from the workflow run. It is a debug APK for direct testing, not a Play Store release-signed package.

For a local build:

```sh
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

## Shared timeline renderer
The shared browser renderer composites active video and image clips in track order, draws text overlays, applies supported clip filters, transforms, masks, chroma key, transitions, blend modes and keyframes, and mixes clip audio through the Web Audio graph. It records the rendered canvas stream with MediaRecorder (MP4 only when the browser actually supports that MIME type; otherwise WebM).

Each clip's speed curve is now compiled once at export start into a source-time lookup table. This avoids repeating numerical integration and binary searches on every animation frame for every clip, reducing avoidable work on lower-memory Android devices. Export dimensions now honour quality labels correctly: 1080p landscape is 1920×1080, 1080p portrait is 1080×1920, and square exports remain square. The renderer also rejects clip out-points that exceed the decoded source media duration instead of silently rendering an empty tail. Device pixel limits are checked against the selected dimensions before rendering.

## Native Android media engines
The APK bundles a Capacitor plugin backed by Android MediaExtractor/MediaMuxer, AndroidX Media3 Transformer and WorkManager.

- **Native audio extraction:** runs as a WorkManager background job, extracts the selected audio range without real-time playback capture, and exposes progress/completion through the job-status bridge. Codec/container compatibility depends on the source track and Android device.
- **Native Media3 transcode:** converts a single source video clip to H.264/AAC MP4. This is a native clip transcode path, not a full timeline renderer; multi-track compositing, text, transitions and editor effects are not passed to Media3.
- **Background media jobs:** WorkManager runs selected-range audio extraction and codec-preserving source remux in the background, with progress and completion status. Source remux does not render a multi-layer project or apply timeline effects.
- **Browser timeline export:** remains the current complete project-render path, including its supported compositing and audio effects. It is not frame-accurate WebCodecs output, and long exports remain constrained by WebView/browser memory and codec support.

Native engine calls require a source URI supplied by the Android file picker. Files imported through a browser or relinked from a web project use the browser-based path. Native paths and the shared renderer still require physical-device validation before being considered production-ready. A successful CI APK build confirms compilation and packaging, not device-level playback/export quality.


## Rendering boundaries
The current browser renderer remains the project-level compositor. It composites overlapping video and image clips in track order, applies supported transforms, filters, masks, chroma key, transitions and timed text, and mixes timeline audio. The Android Media3 action is still a single-source transcode; WorkManager background jobs are media extraction/remux jobs, not a native multi-track project renderer. A full Android composition renderer and real-device QA remain open engineering milestones.


## Built-in creative library
- 100+ browser-rendered colour looks across cinematic, film, portrait, product, colour and creative categories. Added looks are CSS filter pipelines and remain editable on each clip; they are not third-party LUT files.
- 25 one-tap effect combinations combine a filter with clip exposure, contrast, saturation, temperature and vignette controls. They apply to the selected visual clip and travel through the shared preview/export filter pipeline.
- 30 editable starter templates across lifestyle, gaming, business, product, education, creator and event categories. Applying a template creates timed title, subtitle and footer layers, sets the canvas ratio and applies its look/transition starting points to existing clips. Templates are starting compositions, not bundled licensed stock footage or finished pre-rendered videos; users add their own media and replace placeholder text.
- Expanded emoji and symbol sticker palette; imported image stickers remain supported through the overlay/media workflow.
- Five editable transition styles (fade, zoom, wipe, slide and blur), plus motion/keyframe presets remain available in the editor.
- Sound-effect names/categories are discovery labels, not an included library of downloadable copyrighted recordings. Imported or properly licensed sound files are required for timeline use.
