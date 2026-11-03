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

Each clip's speed curve is now compiled once at export start into a source-time lookup table. This avoids repeating numerical integration and binary searches on every animation frame for every clip, reducing avoidable work on lower-memory Android devices. Export dimensions now honour quality labels correctly: 1080p landscape is 1920×1080 and 1080p portrait is 1080×1920. Device pixel limits are checked against those corrected dimensions before rendering.

## Native Android media engines
The APK bundles a Capacitor plugin backed by Android MediaExtractor/MediaMuxer, AndroidX Media3 Transformer and WorkManager.

- **Native audio extraction:** extracts the audio track from a selected video segment without real-time playback capture. Codec/container compatibility depends on the source track and Android device.
- **Native Media3 transcode:** converts a single source video clip to H.264/AAC MP4. This is a native clip transcode path, not a full timeline renderer; multi-track compositing, text, transitions and editor effects are not passed to Media3.
- **Background media job:** WorkManager can copy/remux the source audio/video tracks in the background and report progress. It does not render a multi-layer project or apply timeline effects.
- **Browser timeline export:** remains the current complete project-render path, including its supported compositing and audio effects. It is not frame-accurate WebCodecs output, and long exports remain constrained by WebView/browser memory and codec support.

Native engine calls require a source URI supplied by the Android file picker. Files imported through a browser or relinked from a web project use the browser-based path. Native paths and the shared renderer still require physical-device validation before being considered production-ready. A successful CI APK build confirms compilation and packaging, not device-level playback/export quality.
