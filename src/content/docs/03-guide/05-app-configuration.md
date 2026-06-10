---
title: App Configuration
description: Set bundle id, versions, permissions, and platform settings in whisker.rs.
order: 5
---

# App Configuration

Every Whisker app carries a `whisker.rs` file next to its `Cargo.toml`.
It's an ordinary Rust source file that exposes a single function:

```rust
pub fn configure(app: &mut Config);
```

`whisker run` compiles a tiny probe binary that includes your
`whisker.rs`, calls `configure` with a fresh `Config::default()`, and
serializes the result to JSON. The CLI reads that JSON and projects the
fields it needs — bundle id, scheme, deployment target, application id,
launcher activity — into the native iOS/Android project it generates and
the dev server it launches.

This page is the practical how-to. The exhaustive field-by-field
reference is in [Configuration](/docs/configuration-api).

## The `configure` function

The whole file is one function. Every builder method returns
`&mut Self`, so calls chain, and the `ios`, `android`, and `plugin`
methods each take a closure receiving a mutable reference to the nested
config:

```rust
use whisker_config::Config;

pub fn configure(app: &mut Config) {
    app.name("MyApp")
        .bundle_id("dev.example.myapp")
        .version("1.0.0")
        .build_number(1);
}
```

## Step 1: App-level identity

The top-level setters apply across both platforms. `bundle_id` is the
default both platforms fall back to when their own is unset:

| Setter | Effect |
|---|---|
| `name(impl Into<String>)` | App display name. |
| `bundle_id(impl Into<String>)` | Default bundle id; iOS / Android fall back to it. |
| `version(impl Into<String>)` | Marketing version (`CFBundleShortVersionString` / Gradle `versionName`). |
| `build_number(u32)` | Build number (`CFBundleVersion` / Gradle `versionCode`). |

## Step 2: iOS settings

`app.ios(|c| …)` configures the iOS-only block:

```rust
app.ios(|i| {
    i.bundle_id("dev.example.MyApp")
        .scheme("MyApp")
        .deployment_target("14.0");
});
```

| Setter | Effect |
|---|---|
| `bundle_id(impl Into<String>)` | `CFBundleIdentifier`. Falls back to `Config::bundle_id`. |
| `scheme(impl Into<String>)` | Xcode scheme and the `<scheme>.app` filename. |
| `deployment_target(impl Into<String>)` | `IPHONEOS_DEPLOYMENT_TARGET` (default `"13.0"`). |

## Step 3: Android settings

`app.android(|c| …)` configures the Android-only block:

```rust
app.android(|a| {
    a.package("dev.example.myapp")
        .application_id("dev.example.myapp")
        .launcher_activity(".MainActivity")
        .min_sdk(24)
        .target_sdk(34);
});
```

| Setter | Effect |
|---|---|
| `package(impl Into<String>)` | Kotlin/Java package declared in the manifest (for `R.java` lookups). |
| `application_id(impl Into<String>)` | Gradle `applicationId` — the launcher's package. Falls back to `Config::bundle_id`. |
| `launcher_activity(impl Into<String>)` | Launcher activity class with a leading dot (default `.MainActivity`). |
| `min_sdk(u32)` | Gradle `minSdk` (default `24`). |
| `target_sdk(u32)` | Gradle `targetSdk` (default `34`). |

Note that `application_id` (the package the launcher invokes) is distinct
from `package` (the Kotlin/Java package the manifest declares); apps
usually set both to the same value.

## Step 4: Permissions and native config via plugins

`whisker.rs` doesn't have setters for permissions or `Info.plist` keys.
Those come from **plugins** — crates that contribute to the generated
native project. You opt into one with `.plugin::<P>(|c| …)`, where `P` is
the plugin type and `c` is its typed config (starting from
`P::Config::default()`).

The canonical example is `whisker-audio`'s `WhiskerAudio` plugin, which
contributes the microphone usage description (iOS) and the `RECORD_AUDIO`
permission (Android) the audio engine needs before it can record:

```rust
use whisker_audio::WhiskerAudio;

app.plugin::<WhiskerAudio>(|c| {
    c.microphone_permission("Record clips for podcast episodes.")
        .record_audio_android(true)
        .enable_background_playback(true);
});
```

This generates `NSMicrophoneUsageDescription` in `Info.plist`, a
`<uses-permission android:name="android.permission.RECORD_AUDIO" />` in
the Android manifest, and an `"audio"` entry in iOS `UIBackgroundModes`.
A plugin with nothing to configure reads as `app.plugin::<P>(|_| {})`,
and a plugin you don't register contributes nothing — you don't pay for
permissions you didn't ask for. Calling `plugin::<P>` twice for the same
`P` replaces the prior entry (last call wins).

For the full plugin config surface see
[Configuration](/docs/configuration-api) and
[First-party Modules](/docs/modules-api); to write your own plugin see the
[Plugin API](/docs/plugin-api).

## A note on app icons and splash screens

App icons and splash screens are **not first-class `whisker.rs` fields
yet**. There is no `app.icon(…)` or `app.splash(…)`. Until they land, the
options are:

- **A plugin** — any plugin can drop arbitrary files into the generated
  project (asset catalogs, drawable resources, plist keys), so
  icon/splash provisioning can be packaged as one. See the
  [Plugin API](/docs/plugin-api).
- **Edit the generated project** — the native project Whisker emits lives
  under `gen/` (`gen/ios/`, `gen/android/`). You can drop assets in
  directly as a stopgap, with the caveat that regeneration may overwrite
  hand edits, so it's not durable for anything you want to keep.

## A complete `whisker.rs`

Putting it together — identity, both platforms, and the audio plugin:

```rust
use whisker_audio::WhiskerAudio;
use whisker_config::Config;

pub fn configure(app: &mut Config) {
    app.name("Podcast")
        .bundle_id("dev.example.podcast")
        .version("1.0.0")
        .build_number(1);

    app.ios(|i| {
        i.bundle_id("dev.example.podcast")
            .scheme("Podcast")
            .deployment_target("14.0");
    });

    app.android(|a| {
        a.package("dev.example.podcast")
            .application_id("dev.example.podcast")
            .launcher_activity(".MainActivity")
            .min_sdk(24)
            .target_sdk(34);
    });

    app.plugin::<WhiskerAudio>(|c| {
        c.microphone_permission("Record clips for podcast episodes.")
            .record_audio_android(true)
            .enable_background_playback(true);
    });
}
```

Run it with `whisker run ios` or `whisker run android` — the CLI compiles
this file, reads the serialized `Config`, and projects it into the native
project before launching.
