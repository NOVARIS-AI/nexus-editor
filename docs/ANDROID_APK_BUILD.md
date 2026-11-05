# Android APK build

NEXUS Studio uses Capacitor 7 and Android application ID `com.veltronixnexus.editor`.

## Build from a clean checkout

Requirements: Node.js 22, Java 21, Android SDK and Android build tools.

```sh
npm install
npm run build
npm run android:prepare
npm run android:sync
cd android
./gradlew assembleDebug
```

On Windows, run `gradlew.bat assembleDebug` from the Android directory.

The installable debug APK is written to:

`android/app/build/outputs/apk/debug/app-debug.apk`

## GitHub Actions

The workflow `.github/workflows/android-apk.yml` builds this APK on relevant pushes to `main` or when manually dispatched from GitHub Actions. It uploads the APK as the artifact `NEXUS-Studio-Android-debug` for 30 days. Download the artifact ZIP from the successful workflow run, extract it, and install `app-debug.apk` on an Android device. Android may ask the user to allow installation from the browser or file manager used to open the APK.

This is a debug build, not a Play Store release or a privately signed production build. It can be installed for testing and later replaced by another build signed with the same debug key on the same build environment; debug signing keys may change between CI runs, so Android may require uninstalling an older debug build before installing a new one.

## Supabase configuration

The workflow optionally reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from GitHub Actions repository secrets. Add those two public client configuration values under repository Settings → Secrets and variables → Actions if the APK should connect to the NEXUS Supabase project. Never add a Supabase service-role/secret key to Vite variables, GitHub source, or the APK.

If those optional secrets are absent, the web build may still compile, but Supabase-powered sign-in, saved collections, notifications and other live social features will report that Supabase is not configured.

## Current scope

The APK wraps the current mobile-first NEXUS Studio web application in a Capacitor Android shell. It does not imply native Media3 rendering, background export, or a complete Play Store release. The first successful workflow run is required before an APK artifact exists.
