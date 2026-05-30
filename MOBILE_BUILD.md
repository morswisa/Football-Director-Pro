# Mobile Build

Football Director Pro is packaged for mobile with Capacitor. The web app remains the source of truth; native projects wrap the static `out/` export.

## Prerequisites

- Android: Java Runtime/JDK and Android Studio or Android SDK/Gradle tooling.
- iOS: macOS with full Xcode installed and selected by `xcode-select`.
- Node dependencies installed with `npm install`.

## Checks

```bash
npm run mobile:doctor
```

This runs Capacitor doctor for Android and iOS.

## Sync Web To Native

```bash
npm run mobile:sync
```

This runs `next build`, writes the static export to `out/`, and syncs it into `android/` and `ios/`.

## Local Debug Builds

```bash
npm run mobile:build:android
npm run mobile:build:ios
```

The Android command builds a debug APK through Gradle. The iOS command builds the `App` scheme for a generic iOS Simulator target.

## Current Local Environment Note

The native project shells and Capacitor configuration are valid: `npx cap doctor android` and `npx cap doctor ios` pass. In this workspace, binary builds are blocked until Java Runtime/JDK and full Xcode are installed.
