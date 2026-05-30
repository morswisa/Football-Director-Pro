# Native Build Audit

Date: 2026-05-30

## Current State

The Football Director Pro web game and Capacitor project shells are ready for native packaging workflow. The native binary build step is blocked by local machine toolchain availability, not by a known project-code issue.

## Evidence

| Check | Result | Meaning |
| --- | --- | --- |
| `npm run mobile:doctor` | Passed for Android and iOS | Capacitor dependencies and native project shells are valid. |
| `java -version` | Failed: unable to locate a Java Runtime | Android Gradle builds cannot run until a JDK is installed. |
| `/usr/libexec/java_home -V` | Failed: unable to locate a Java Runtime | macOS has no discoverable Java installation for Gradle. |
| `xcode-select -p` | `/Library/Developer/CommandLineTools` | The active developer directory is CommandLineTools, not full Xcode. |
| `xcodebuild -version` | Failed because active directory is CommandLineTools | iOS builds cannot run until full Xcode is installed and selected. |
| `android/` and `ios/` folders | Present | Capacitor native project shells exist in the repository. |

## Required Before Native Binary Builds

Android:

1. Install a supported Java Runtime/JDK.
2. Ensure Android Studio or Android SDK/Gradle tooling is installed and configured.
3. Rerun:

```bash
npm run mobile:doctor
npm run mobile:build:android
```

iOS:

1. Install full Xcode.
2. Select full Xcode with `xcode-select`, for example:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

3. Accept any required Xcode license prompts.
4. Rerun:

```bash
npm run mobile:doctor
npm run mobile:build:ios
```

## Conclusion

Web V1 gameplay is accepted by the current automated evidence. Capacitor sync and native project health checks pass. The remaining native binary deliverable is blocked until Java Runtime/JDK and full Xcode are available on the machine.
