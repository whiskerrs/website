---
title: App Configuration
description: Set bundle id, versions, permissions, app icons, and platform settings in whisker.rs.
order: 5
---

# App Configuration

Every Whisker app carries a `whisker.rs` file next to its `Cargo.toml`.
Its `main` function calls `whisker_config::run` to fill a fresh `Config` and
write JSON. The CLI reads that configuration to generate platform projects
and launch the development session. Keep stdout reserved for the JSON result;
use `eprintln!` for diagnostics.

This page is the practical how-to. The exhaustive field-by-field
reference is in [Configuration](/docs/configuration-api).

## The configuration entry point

Configure the app inside the closure passed to `whisker_config::run`. Every
builder method returns `&mut Self`, so calls chain, and the `ios`, `android`, and `plugin`
methods each take a closure receiving a mutable reference to the nested
config:

```rust
fn main() {
    whisker_config::run(|app| {
        app.name("MyApp")
            .bundle_id("dev.example.myapp")
            .version("1.0.0")
            .build_number(1);
    });
}
```

## Cargo registration and editor support

`whisker new` registers `whisker.rs` as a binary in your application's
`Cargo.toml`:

```toml
[[bin]]
name = "whisker-config"
path = "whisker.rs"
required-features = ["whisker-config"]
test = false
bench = false

[features]
whisker-config = []
```

The application also depends directly on `whisker-config`, using the version
provided by the CLI template. Rust-analyzer discovers the file through Cargo,
so completion and navigation work without `linkedProjects` or a separate
configuration package. The feature stays disabled by default; it does not need
to be enabled for completion.

Add plugin crates with `cargo add`, then use their configuration APIs in
`whisker.rs`. No second dependency list needs to be maintained.

To inspect the JSON directly:

```sh
cargo run --bin whisker-config --features whisker-config
```

This command also compiles your application library. Whisker's own commands
use a small separate probe so application compilation is unnecessary when
evaluating configuration. The probe provides `whisker-config` and discovered
plugin crates with their default features disabled; arbitrary application
dependencies and application feature flags are not available there.

Projects using `pub fn configure(app: &mut whisker_config::Config)` without a
configuration bin remain supported. To enable editor support, add the manifest
entries above and the `whisker-config` dependency, then move the function body
into `fn main() { whisker_config::run(|app| { /* configuration */ }); }`.

## Step 1: App-level identity

The top-level setters apply across both platforms. `bundle_id` is the
default both platforms fall back to when their own is unset:

| Setter                         | Effect                                                                   |
| ------------------------------ | ------------------------------------------------------------------------ |
| `name(impl Into<String>)`      | App display name.                                                        |
| `bundle_id(impl Into<String>)` | Default bundle id; iOS / Android fall back to it.                        |
| `version(impl Into<String>)`   | Marketing version (`CFBundleShortVersionString` / Gradle `versionName`). |
| `build_number(u32)`            | Build number (`CFBundleVersion` / Gradle `versionCode`).                 |

## Step 2: iOS settings

`app.ios(|c| …)` configures the iOS-only block:

```rust
app.ios(|i| {
    i.bundle_id("dev.example.MyApp")
        .scheme("MyApp")
        .deployment_target("14.0");
});
```

| Setter                                 | Effect                                                   |
| -------------------------------------- | -------------------------------------------------------- |
| `bundle_id(impl Into<String>)`         | `CFBundleIdentifier`. Falls back to `Config::bundle_id`. |
| `scheme(impl Into<String>)`            | Xcode scheme and the `<scheme>.app` filename.            |
| `deployment_target(impl Into<String>)` | `IPHONEOS_DEPLOYMENT_TARGET` (default `"13.0"`).         |

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

| Setter                                 | Effect                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `package(impl Into<String>)`           | Kotlin/Java package declared in the manifest (for `R.java` lookups).                |
| `application_id(impl Into<String>)`    | Gradle `applicationId` — the launcher's package. Falls back to `Config::bundle_id`. |
| `launcher_activity(impl Into<String>)` | Launcher activity class with a leading dot (default `.MainActivity`).               |
| `min_sdk(u32)`                         | Gradle `minSdk` (default `24`).                                                     |
| `target_sdk(u32)`                      | Gradle `targetSdk` (default `34`).                                                  |

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

## Step 5: App icon

App icons ship as a **built-in plugin**, `AppIcon`, exported by
`whisker_config` — no extra dependency to add. One square PNG
(1024×1024 or larger) is enough for both platforms:

```rust
use whisker_config::AppIcon;

app.plugin::<AppIcon>(|c| {
    c.source("assets/icon.png");
});
```

The path is relative to the app crate root (the directory holding
`Cargo.toml` and `whisker.rs`). From that one image Whisker generates:

- **iOS** — a single-size asset catalog (`AppIcon.appiconset`). Xcode's
  actool derives every runtime size and the `Info.plist` icon entries
  during the build. Transparency is flattened onto white — App Store
  validation rejects transparent icons.
- **Android** — legacy launcher mipmaps (five densities, for API ≤ 25)
  plus an adaptive icon (API 26+) that uses the source as the
  foreground over a white background, and the `android:icon` manifest
  attribute.

Two optional per-platform refinements sit on top of `source`.

### Android adaptive-icon layers

Android 8+ renders launcher icons from separate foreground/background
layers (the [adaptive icon](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
model). Supply them explicitly for full control:

```rust
app.plugin::<AppIcon>(|c| {
    c.source("assets/icon.png")
        .android_foreground("assets/icon-fg.png")   // 108 dp layer
        .android_background_color("#0087DC")        // or android_background(image)
        .android_monochrome("assets/icon-fg.png");  // Android 13+ themed icon
});
```

Launchers mask the adaptive canvas to its central ~66%, so keep the
foreground artwork inside that safe zone (transparent padding around
it). `android_background` (an image) and `android_background_color`
(`#RRGGBB` / `#AARRGGBB`) are mutually exclusive; the default is white.
`android_monochrome` feeds the `<monochrome>` layer that Android 13+
uses for themed icons — launchers tint it, so only its alpha matters.

### iOS Liquid Glass (`.icon`)

For the iOS 26 Liquid Glass appearances (default / dark / clear /
tinted), export a layered `.icon` bundle from **Icon Composer** (an app
bundled with Xcode 26) and point `ios_icon` at it:

```rust
app.plugin::<AppIcon>(|c| {
    c.source("assets/icon.png") // still required — it feeds Android
        .ios_icon("assets/AppIcon.icon");
});
```

This replaces the PNG-derived asset catalog: actool renders every
appearance from the bundle's layered definition and generates flattened
fallbacks for older iOS versions automatically. Building with `ios_icon`
requires Xcode 26 or newer. Without it, iOS 26 still shows your PNG icon
and derives the glass variants from it on-device — `ios_icon` is for
tuning how they look.

## A note on splash screens

Splash screens are **not a first-class `whisker.rs` field yet**. There
is no `app.splash(…)`. Until it lands, the options are:

- **A plugin** — any plugin can drop arbitrary files into the generated
  project (storyboards, drawable resources, plist keys), so splash
  provisioning can be packaged as one. See the
  [Plugin API](/docs/plugin-api).
- **Edit the generated project** — the native project Whisker emits lives
  under `gen/` (`gen/ios/`, `gen/android/`). You can drop assets in
  directly as a stopgap, with the caveat that regeneration may overwrite
  hand edits, so it's not durable for anything you want to keep.

## A complete `whisker.rs`

Putting it together — identity, both platforms, the app icon, and the
audio plugin:

```rust
use whisker_audio::WhiskerAudio;
use whisker_config::AppIcon;

fn main() {
    whisker_config::run(|app| {
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

        app.plugin::<AppIcon>(|c| {
            c.source("assets/icon.png");
        });

        app.plugin::<WhiskerAudio>(|c| {
            c.microphone_permission("Record clips for podcast episodes.")
                .record_audio_android(true)
                .enable_background_playback(true);
        });
    });
}
```

Run it with `whisker run ios` or `whisker run android` — the CLI compiles
this file, reads the serialized `Config`, and projects it into the native
project before launching.
