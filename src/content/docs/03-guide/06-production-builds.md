---
title: Production Builds
description: Build, sign, and ship a release.
order: 6
---

# Production Builds

`whisker run` is a development tool: it builds debug binaries, installs
them, and keeps a hot-reload loop alive. It does **not** wrap release
builds. To ship, you drive the platform's own toolchain —
`xcodebuild` and Gradle — directly against the generated native
projects, exactly the way CI does.

Both platforms scaffold a real native project under `gen/`:

- `gen/android/` — a standard Gradle project (`./gradlew`, `app/`, …).
- `gen/ios/` — a standard Xcode project (`<Scheme>.xcodeproj`).

These are regenerated whenever you run `whisker run`. Keep that in mind
when you reach the signing section below — it's the one sharp edge.

## Android release

The Android host project is a plain Gradle app. Build a release APK
straight from `gen/android/`:

```sh
( cd gen/android && ./gradlew :app:assembleRelease )
```

The APK lands at:

```
gen/android/app/build/outputs/apk/release/app-release.apk
```

For Play Store upload you usually want an Android App Bundle instead:

```sh
( cd gen/android && ./gradlew :app:bundleRelease )
# → gen/android/app/build/outputs/bundle/release/app-release.aab
```

### Signing

An unsigned release build is not installable. Wire up a Gradle
`signingConfig` the standard Android way, in `gen/android/app/build.gradle.kts`:

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("WHISKER_KEYSTORE") ?: "release.keystore")
            storePassword = System.getenv("WHISKER_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("WHISKER_KEY_ALIAS")
            keyPassword = System.getenv("WHISKER_KEY_PASSWORD")
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

Because `gen/android/` is regenerated on every `whisker run`, treat the
in-tree `build.gradle.kts` as disposable for signing purposes. The
robust options are:

- Keep a release build off a copy of `gen/android/` that you don't
  regenerate (e.g. a CI checkout where you only `whisker run` for dev).
- Inject signing from a [plugin](/docs/plugin-api) so it's reapplied
  every time the project is generated.

> First-class signing configuration does not live in `whisker.rs` yet.
> Until it does, manage it at the Gradle level as above.

## iOS release

The iOS host is a normal Xcode project, so you build it with
`xcodebuild`. The key distinction is **Simulator vs device**: a release
you can submit must be a device (arm64) build, not a Simulator build.

Build a Release configuration for a connected device:

```sh
( cd gen/ios && xcodebuild \
    -project MyApp.xcodeproj \
    -scheme MyApp \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    build )
```

For App Store submission, archive instead of plain `build`:

```sh
( cd gen/ios && xcodebuild \
    -project MyApp.xcodeproj \
    -scheme MyApp \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/MyApp.xcarchive \
    archive )
```

Then export an `.ipa` from the archive with
`xcodebuild -exportArchive` and your `ExportOptions.plist`, the standard
Apple flow.

### Code signing

Device builds require a signing identity and a provisioning profile.
Provide them to `xcodebuild` the usual way:

```sh
xcodebuild ... \
    DEVELOPMENT_TEAM=ABCDE12345 \
    CODE_SIGN_STYLE=Automatic
```

> **Important caveat.** `gen/ios/` is regenerated on every
> `whisker run`. Any signing configuration baked into the generated
> Xcode project — team IDs, provisioning specifiers, entitlements — is
> lost on the next regeneration. Don't hand-edit the generated
> `.xcodeproj` and expect it to stick.

Manage signing one of these ways instead:

- Pass `DEVELOPMENT_TEAM` / `CODE_SIGN_STYLE` on the `xcodebuild`
  command line (as above), so nothing needs to persist in the project.
- Build releases from a non-regenerated copy of `gen/ios/` whose
  project settings you own.
- Apply signing from a [plugin](/docs/plugin-api) that re-runs on every
  generation.

As on Android, first-class signing config isn't in `whisker.rs` yet —
drive it at the `xcodebuild` / Xcode level for now.

## The iOS SwiftPM runtime dependency

You rarely need to touch this — it matters only when bumping Whisker —
but it's worth understanding what your iOS app actually depends on.

The generated iOS project doesn't vendor Whisker's Swift runtime. It
resolves `WhiskerRuntime` (and the companion Swift targets) from the
remote **`whisker` SwiftPM package**, pinned to a git tag. The version
is defined once in Rust:

```rust
// crates/whisker-build/src/ios.rs
pub const WHISKER_IOS_SPM_URL: &str = "https://github.com/whiskerrs/whisker.git";
pub const WHISKER_IOS_SPM_VERSION: &str = "0.1.0";
```

That constant drives the `XCRemoteSwiftPackageReference` the generator
writes into your project. It **must stay in lockstep** with the
published `vX.Y.Z` git tag — every module's `Package.swift` hardcodes
the same `exact:` version, so all of them, the constant, and the tag
move together. The pieces that have to align per release:

| crates.io | iOS SwiftPM tag | Android SDK (Maven) | Gradle plugin | Lynx fork |
|---|---|---|---|---|
| `0.1.0` | `v0.1.0` | `0.1.1` | `0.4.0` | `3.8.0-whisker.6` |

For most app authors this is invisible: you install a `whisker-cli`
version, and the iOS package version it pins comes along for the ride.
You only deal with the matrix when you're the one bumping Whisker.

## App Store / Play submission

There's nothing Whisker-specific about submission. `whisker` produces a
**normal native app** — a signed APK/AAB and a signed `.ipa`. From
there:

- **iOS** — archive, then upload to App Store Connect (Xcode Organizer,
  `xcrun altool`, or Transporter), and submit for review.
- **Android** — upload the AAB to the Play Console and roll it out.

See the [CLI reference](/docs/cli-reference) for the development
commands that produce the `gen/` projects these builds run against.
