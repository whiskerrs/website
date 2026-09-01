---
title: Production Builds
description: Build, sign, and ship a release.
order: 6
---

# Production Builds

`whisker run` is the development loop. `whisker build` produces release
artifacts and drives the same native or Web toolchain used by the generated
project:

```sh
whisker build appbundle
whisker build apk
whisker build ipa
whisker build macos
whisker build web
```

Every target shares a generated project under `gen/`:

- `gen/android/` — a standard Gradle project (`./gradlew`, `app/`, …).
- `gen/ios/` — a standard Xcode project (`<Scheme>.xcodeproj`).
- `gen/macos/` — a Cargo-based macOS application project.
- `gen/web/` — the browser entry, loader, and static assets.

These directories are CNG output shared by `run` and `build`. Do not hand-edit
them; express persistent configuration in `whisker.rs`, module metadata, or a
plugin.

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

Because `gen/android/` is generated output, treat its `build.gradle.kts` as
disposable. Persistent signing customization belongs in the credential flow or
a plugin:

- Inject signing from a [plugin](/docs/plugin-api) so it's reapplied
  every time the project is generated.

For the supported credential workflow, run `whisker build appbundle --help` or
`whisker credential --help`.

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
- Apply signing from a [plugin](/docs/plugin-api) that re-runs on every
  generation.

`whisker build ipa --help` documents the supported export and credential
options; Xcode remains available for custom archive workflows.

## The iOS SwiftPM runtime dependency

You rarely need to touch this — it matters only when bumping Whisker —
but it's worth understanding what your iOS app actually depends on.

The generated iOS project doesn't vendor Whisker's Swift runtime. It
resolves `WhiskerRuntime` (and the companion Swift targets) from the
remote **`whisker` SwiftPM package**, pinned to a git tag. The version
is defined once in the CNG implementation:

```rust
// crates/whisker-cng/src/ios_modules.rs
pub const WHISKER_IOS_SPM_URL: &str = "https://github.com/whiskerrs/whisker.git";
pub const WHISKER_IOS_SPM_VERSION: &str = "...";
```

That constant drives the `XCRemoteSwiftPackageReference` the generator
writes into your project. It must stay compatible with the published
Swift package tag and with module `Package.swift` pins. The release process
also keeps the Rust crates, Android SDK, and Gradle plugin compatible. Consult
the release notes for exact versions instead of copying a static matrix from
this guide.

For most app authors this is invisible: you install a `whisker-cli`
version, and the iOS package version it pins comes along for the ride.
You only deal with those pins when you're the one releasing Whisker.

## App Store / Play submission

There's nothing Whisker-specific about submission. `whisker` produces a
**normal native app** — a signed APK/AAB and a signed `.ipa`. From
there:

- **iOS** — archive, then upload to App Store Connect (Xcode Organizer,
  `xcrun altool`, or Transporter), and submit for review.
- **Android** — upload the AAB to the Play Console and roll it out.

Both stores require an app icon. Set one with the built-in `AppIcon`
plugin — see [App Configuration](/docs/app-configuration#step-5-app-icon).
Without it, submission fails validation (iOS rejects the missing icon;
Play requires a launcher icon).

See the [CLI reference](/docs/cli-reference) for the development
commands that produce the `gen/` projects these builds run against.
