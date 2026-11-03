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

## Important engine boundaries
The Android shell does not magically turn browser rendering into a native Media3/MediaCodec pipeline. Timeline rendering, audio extraction and effects still use the shared WebView/browser engine at this stage, so codec support, memory use and long-export reliability remain device-dependent. The native picker and native file-save path remove two important browser-only workflow dependencies. Native Media3 rendering, background WorkManager exports and Android-native audio extraction are separate engine milestones and must be implemented and tested before claiming feature parity with a professional native editor.
