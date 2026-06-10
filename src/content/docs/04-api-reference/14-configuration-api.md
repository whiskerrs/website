---
title: Configuration
description: The Config types used in whisker.rs.
order: 14
---

# API Reference: Configuration

Every Whisker app carries a `whisker.rs` file — an ordinary Rust source
file that exposes a single `configure` function:

```rust
pub fn configure(app: &mut Config);
```

`whisker run` compiles a tiny probe binary that includes your
`whisker.rs`, calls `configure` with a fresh
[`Config::default()`](#config), and serializes the resulting `Config` to
JSON. The CLI parses that JSON and projects the fields it needs (paths,
application id, bundle id, scheme, deployment target, …) into the native
project it generates and the dev-server it launches.

The types below come from the `whisker-config` crate, re-exported as
[`whisker::config`](/docs/overview).

## A complete `whisker.rs`

```rust
use whisker_config::Config;

pub fn configure(app: &mut Config) {
    app.name("MyApp")
        .bundle_id("dev.example.myapp")
        .version("1.0.0")
        .build_number(1);

    app.ios(|i| {
        i.bundle_id("dev.example.MyApp")
            .scheme("MyApp")
            .deployment_target("14.0");
    });

    app.android(|a| {
        a.application_id("dev.example.myapp")
            .launcher_activity(".MainActivity")
            .min_sdk(24)
            .target_sdk(34);
    });
}
```

Every builder method returns `&mut Self`, so calls chain. The `ios`,
`android`, and `plugin` methods take a closure that receives a mutable
reference to the nested config.

## `Config`

The root configuration object.

### Fields

| Field | Type | Notes |
|---|---|---|
| `name` | `Option<String>` | App display name. |
| `bundle_id` | `Option<String>` | Default bundle id; iOS / Android fall back to it when their own is unset. |
| `version` | `Option<String>` | Marketing version (e.g. `CFBundleShortVersionString` / Gradle `versionName`). |
| `build_number` | `Option<u32>` | Build number (e.g. `CFBundleVersion` / Gradle `versionCode`). |
| `ios` | [`IosConfig`](#iosconfig) | iOS-specific settings. |
| `android` | [`AndroidConfig`](#androidconfig) | Android-specific settings. |
| `plugins` | `BTreeMap<String, serde_json::Value>` | Per-plugin config, keyed by `PluginConfig::NAME`. Populated by [`plugin`](#plugin). |

### Methods

| Method | Signature | Notes |
|---|---|---|
| `name` | `name(impl Into<String>) -> &mut Self` | Set the app name. |
| `bundle_id` | `bundle_id(impl Into<String>) -> &mut Self` | Set the default bundle id. |
| `version` | `version(impl Into<String>) -> &mut Self` | Set the marketing version. |
| `build_number` | `build_number(u32) -> &mut Self` | Set the build number. |
| `ios` | `ios(impl FnOnce(&mut IosConfig)) -> &mut Self` | Configure the iOS block. |
| `android` | `android(impl FnOnce(&mut AndroidConfig)) -> &mut Self` | Configure the Android block. |
| `plugin::<P>` | `plugin<P: Plugin>(impl FnOnce(&mut P::Config)) -> &mut Self` | Declare and configure a plugin. |

## `IosConfig`

### Fields

| Field | Type | Notes |
|---|---|---|
| `bundle_id` | `Option<String>` | `CFBundleIdentifier`. Falls back to `Config::bundle_id` if unset. |
| `scheme` | `Option<String>` | Xcode scheme + `<scheme>.app` filename. |
| `deployment_target` | `Option<String>` | `IPHONEOS_DEPLOYMENT_TARGET` (default `"13.0"`). |

### Methods

| Method | Signature |
|---|---|
| `bundle_id` | `bundle_id(impl Into<String>) -> &mut Self` |
| `scheme` | `scheme(impl Into<String>) -> &mut Self` |
| `deployment_target` | `deployment_target(impl Into<String>) -> &mut Self` |

## `AndroidConfig`

### Fields

| Field | Type | Notes |
|---|---|---|
| `package` | `Option<String>` | Kotlin/Java package declared in the manifest (for `R.java` lookups). |
| `min_sdk` | `Option<u32>` | Gradle `minSdk` (default `24`). |
| `target_sdk` | `Option<u32>` | Gradle `targetSdk` (default `34`). |
| `application_id` | `Option<String>` | Gradle `applicationId` — the launcher's package. Falls back to `Config::bundle_id`. |
| `launcher_activity` | `Option<String>` | Launcher activity class with a leading dot (default `.MainActivity`). |

### Methods

| Method | Signature |
|---|---|
| `package` | `package(impl Into<String>) -> &mut Self` |
| `min_sdk` | `min_sdk(u32) -> &mut Self` |
| `target_sdk` | `target_sdk(u32) -> &mut Self` |
| `application_id` | `application_id(impl Into<String>) -> &mut Self` |
| `launcher_activity` | `launcher_activity(impl Into<String>) -> &mut Self` |

## Registering plugins

Plugins that contribute to the generated native project are declared in
`whisker.rs` via `.plugin::<P>(|c| …)`, where `P` is the plugin type and
`c` is `&mut P::Config`:

```rust
app.plugin::<WhiskerAudio>(|_| {});
```

The closure starts from `P::Config::default()`, so a plugin with no
options to set reads as `|_| {}`. Each entry is stored under
`plugins[P::Config::NAME]`; calling `plugin::<P>` twice for the same `P`
replaces the prior entry (last call wins).

First-party native modules such as
[`whisker-audio`](/docs/modules-api) are registered this way. To author
your own plugin, see the [Plugin API](/docs/plugin-api).
