---
title: Authoring a Plugin
description: Contribute Info.plist keys, permissions, and Gradle config to the generated native project.
order: 4
---

# Authoring a Plugin

A Whisker **plugin** is a cargo crate that contributes to the *generated
native host project* during `whisker run` or a build — `Info.plist`
keys, Android manifest permissions, Gradle dependencies, xcodeproj build
phases, and arbitrary dropped-in files. Plugins run at **generate time**,
against an in-memory model of the iOS/Android project; they are not part
of your app at runtime.

This guide walks through writing one end to end. For the exhaustive type
catalog, link out to the [Plugin API reference](/docs/plugin-api) rather
than re-reading it here.

## Plugin or module?

Reach for a plugin when you're adjusting the *native project itself*: a
permission, a plist key, a Gradle dependency, an extra bundled file. If
instead you're adding a *capability your code uses* — a native widget to
render or a native function to call — you want a **module**, which ships
Rust + Swift + Kotlin and is consumed as a normal crate dependency. See
[Modules & Plugins](/docs/modules-and-plugins) for the full mental model
and [Authoring a Module](/docs/authoring-a-module) for that path.

The two mechanisms compose: a crate can ship both. `whisker-audio` does
exactly this — a `Player` runtime *module* plus a `WhiskerAudio` *plugin*
that contributes the microphone usage description (iOS) and the
`RECORD_AUDIO` permission (Android) the engine needs before it can
record.

## The crate shape

A plugin is two Rust pieces plus one `Cargo.toml` marker:

1. A typed **`PluginConfig`** struct — the options the user spells in
   `whisker.rs`. It must derive `Default`, `Serialize`, and
   `Deserialize`.
2. A unit struct that implements the **`Plugin`** trait and owns the
   `apply` logic.
3. A thin `[[bin]]` entry point calling `whisker_plugin::run_as_subprocess`,
   plus a `[package.metadata.whisker.plugins.<name>]` table so the CLI
   discovers and runs it.

### `Cargo.toml`

```toml
[package]
name = "whisker-foo"
version = "0.1.0"
edition = "2021"
license = "MIT OR Apache-2.0"
description = "Whisker plugin — short tagline that shows up on crates.io."

# Ship the bin + the plugin source when you `cargo publish`.
include = [
    "Cargo.toml",
    "src/**/*.rs",
    "bin/**/*.rs",
    "README.md",
]

# The module-system marker. The CLI walks the consuming app's dep tree
# and picks out every dep carrying this table.
[package.metadata.whisker]

# Plugin registration. The bare key after `plugins.` is the plugin's
# stable kebab-case name; it must match `<Plugin::Config>::NAME`.
[package.metadata.whisker.plugins.whisker-foo]
bin = "whisker-foo-plugin"          # the [[bin]] target name in this crate
# after = ["whisker-info-plist"]    # optional ordering hints
# before = []

[[bin]]
name = "whisker-foo-plugin"
path = "bin/whisker_foo_plugin.rs"
test = false
bench = false
doc = false

[dependencies]
whisker-plugin = "0.1"
serde = { version = "1", features = ["derive"] }
anyhow = "1"
```

A published plugin is *just a crate on crates.io* — no `Package.swift`,
no `build.gradle.kts`, no native source dirs (unless the crate is also a
module).

## Step 1 — define `PluginConfig`

The Config struct is the typed surface the user fills in via
`app.plugin::<WhiskerFoo>(|c| …)`. The `NAME` const is the plugin's
stable kebab-case identifier — prefix first-party plugins with
`whisker-` — and must match the `[package.metadata.whisker.plugins.<name>]`
table key in `Cargo.toml`.

```rust
// src/lib.rs (or src/plugin.rs)
use serde::{Deserialize, Serialize};
use whisker_plugin::{
    GenerateContext, Operation, PlistValue, Plugin, PluginConfig, Target,
};

#[derive(Default, Serialize, Deserialize)]
pub struct WhiskerFooConfig {
    /// Doc comments show up in IDE tooltips when the user types `c.`
    /// inside `app.plugin::<WhiskerFoo>(|c| …)`.
    #[serde(default)]
    pub camera_permission: Option<String>,
    #[serde(default)]
    pub analytics_android: bool,
}

impl WhiskerFooConfig {
    /// Fluent setters — by convention, named after the field they touch.
    pub fn camera_permission(&mut self, description: impl Into<String>) -> &mut Self {
        self.camera_permission = Some(description.into());
        self
    }
    pub fn analytics_android(&mut self, enabled: bool) -> &mut Self {
        self.analytics_android = enabled;
        self
    }
}

impl PluginConfig for WhiskerFooConfig {
    const NAME: &'static str = "whisker-foo";
}
```

The `Serialize + Deserialize + Default` bounds matter: `Default` is the
starting point for the `|c| …` closure (so a no-options plugin reads as
`app.plugin::<WhiskerFoo>(|_| {})`), and the serde bounds let the config
cross the JSON wire to the plugin subprocess.

## Step 2 — implement `Plugin`

The plugin struct is usually a unit struct; `apply` runs against the
Config alone. It receives a mutable
[`GenerateContext`](/docs/plugin-api#generatecontext) carrying both
per-target IRs. Each is an `Option`, because a given run may target only
one platform — always branch with `if let Some(ios) = ctx.ios.as_mut()`
rather than unwrapping.

```rust
pub struct WhiskerFoo;

impl Plugin for WhiskerFoo {
    type Config = WhiskerFooConfig;

    fn apply(&self, ctx: &mut GenerateContext, cfg: &WhiskerFooConfig) -> anyhow::Result<()> {
        // ----- iOS Info.plist contributions ------------------------------
        if let Some(ios) = ctx.ios.as_mut() {
            if let Some(desc) = cfg.camera_permission.as_ref() {
                ios.info_plist.insert(
                    "NSCameraUsageDescription".into(),
                    PlistValue::String(desc.clone()),
                );
                ctx.journal.record(
                    WhiskerFooConfig::NAME,
                    Target::Ios,
                    "info_plist.NSCameraUsageDescription",
                    Operation::Set,
                );
            }
        }

        // ----- Android manifest contributions ----------------------------
        if let Some(android) = ctx.android.as_mut() {
            if cfg.analytics_android {
                android
                    .manifest
                    .permissions
                    .push("android.permission.CAMERA".into());
                ctx.journal.record(
                    WhiskerFooConfig::NAME,
                    Target::Android,
                    "manifest.permissions",
                    Operation::ArrayPush { count: 1 },
                );
            }
        }

        Ok(())
    }
}
```

The trait has three more slots, all defaulted; most plugins leave them
alone:

| Slot | Default | Use when |
|---|---|---|
| `name` | `Self::Config::NAME` | You want a different registration identifier than the Config's `NAME`. Rare. |
| `after` / `before` | `&[]` | Your plugin reads a field another plugin writes (`after`), or sets a default another plugin should be able to override (`before`). |
| `validate` | `Ok(())` | The Config admits combinations the type system can't reject — run it *before* mutating so a bad config aborts cleanly. |

## Step 3 — contributing to iOS

You mutate the [`IosProjectIr`](/docs/plugin-api#ios-ir) on
`ctx.ios`. The most common contribution is an `Info.plist` key. The
plist tree is a `BTreeMap<String, PlistValue>`, where `PlistValue` is a
tagged union — `String`, `Integer`, `Real`, `Boolean`, `Array`, `Dict`.

```rust
if let Some(ios) = ctx.ios.as_mut() {
    // A usage-description string.
    ios.info_plist.insert(
        "NSCameraUsageDescription".into(),
        PlistValue::String("Scan QR codes to pair devices.".into()),
    );

    // An array value (e.g. background modes).
    ios.info_plist.insert(
        "UIBackgroundModes".into(),
        PlistValue::Array(vec![PlistValue::String("audio".into())]),
    );

    ctx.journal.record(
        WhiskerFooConfig::NAME,
        Target::Ios,
        "info_plist.NSCameraUsageDescription",
        Operation::Set,
    );
}
```

Beyond the plist, `IosProjectIr` also exposes `pbxproj_ops`
(`AddResource` / `AddSource` / `SetBuildSetting` / `LinkSystemFramework`,
replayed against the xcodeproj template) and `extra_files` (dropped into
`gen/ios/`). The IR also carries **core fields** — `app_name`, `version`,
`build_number`, `bundle_id`, `scheme`, `deployment_target` — seeded from
`Config` before any plugin runs. Read them as defaults, or override one
(recording `Operation::Override`) when you intentionally stomp the
user's value, e.g. a flavor plugin appending `.staging` to `bundle_id`.
See [iOS IR](/docs/plugin-api#ios-ir) for the full field list.

## Step 4 — contributing to Android

You mutate the [`AndroidProjectIr`](/docs/plugin-api#android-ir) on
`ctx.android`. A permission is a string pushed onto
`manifest.permissions` (the engine dedups at render time):

```rust
if let Some(android) = ctx.android.as_mut() {
    // A manifest permission.
    android
        .manifest
        .permissions
        .push("android.permission.CAMERA".into());
    ctx.journal.record(
        WhiskerFooConfig::NAME,
        Target::Android,
        "manifest.permissions",
        Operation::ArrayPush { count: 1 },
    );

    // A <meta-data> entry inside <application>.
    android.manifest.application_meta_data.push(
        whisker_plugin::MetaDataEntry {
            name: "com.example.API_KEY".into(),
            value: "abc123".into(),
        },
    );

    // A Gradle dependency — pass the raw DSL line.
    android.gradle.dependencies.push(
        "implementation(\"com.google.firebase:firebase-analytics:21.5.0\")".into(),
    );
}
```

`manifest.application_meta_data` takes
[`MetaDataEntry`](/docs/plugin-api#metadataentry) (`<meta-data>` inside
`<application>`), and `gradle` is a
[`GradleDsl`](/docs/plugin-api#gradledsl) with `apply_plugins`
(ids for the `plugins { }` block) and `dependencies` (raw lines for
`dependencies { }`). Passing the raw line keeps `implementation` / `api`
/ `kapt` differences expressible without modelling Gradle's grammar. As
on iOS, the IR also has core fields (`application_id`, `min_sdk`,
`target_sdk`, …) and an `extra_files` map.

## The mutation journal

Pair every IR write with a `ctx.journal.record(…)` call. The journal is
how the engine attributes conflicts ("plugin A and plugin B both `Set`
`info_plist.CFBundleIdentifier`"), prints a "who set this" summary on a
verbose generate, and orders output deterministically.

The three operation kinds:

- **`Set`** — first write to a previously-unset field. Two `Set`s to the
  same path from different plugins is a hard error.
- **`Override`** — explicit stomp of a prior value (a core field or
  another plugin's write). Pair with `after()` so the ordering is
  intentional.
- **`ArrayPush { count }`** — appended `count` items to an array-shaped
  field (permissions, meta-data, pbxproj ops…).

The dotted path (`"manifest.permissions"`,
`"info_plist.UIBackgroundModes"`) is a human-readable convention — the
engine doesn't parse it.

> **`app_meta` vs the IR.** `ctx.app_meta` is a read-only snapshot frozen
> at pipeline entry. If you override `ios.bundle_id`, downstream plugins
> reading `ctx.app_meta.ios_bundle_id` still see the *original* user
> value. Use `app_meta` for attribution and diagnostics; use the IR for
> fields that flow into the rendered project.

## Step 5 — the subprocess binary

Third-party plugins run as subprocesses: the engine spawns the binary,
writes a `PluginRequest` (config + current IR) as JSON to stdin, and
reads a `PluginResponse` (mutated IR) from stdout. The
[`run_as_subprocess`](/docs/plugin-api#run_as_subprocess) helper handles
the whole wire format, so the binary is five lines:

```rust
// bin/whisker_foo_plugin.rs
fn main() -> anyhow::Result<()> {
    whisker_plugin::run_as_subprocess(whisker_foo::WhiskerFoo)
}
```

It reads the request, asserts the name matches, decodes the config (or
uses `Default` when the engine sends `null`), runs `validate` then
`apply`, and writes the response. Any error propagated by `?` exits with
status 1 and the message on stderr — the contract the engine expects.
Stdout is strictly the response envelope; **stderr is yours** for
human-readable diagnostics.

## How the CLI finds and runs your plugin

Discovery is driven entirely by cargo metadata plus how the user spelled
`app.plugin::<…>`. During `whisker run` / build the CLI
(`whisker-cng::discover_plugins`) runs `cargo metadata` over the app's
transitive dependency graph and picks out every crate carrying a
`[package.metadata.whisker.plugins.<name>]` table. Each entry names a
`bin` target; the CLI builds that bin and registers it as a subprocess
plugin pointing at the resulting binary. This works identically whether
the dep resolved from a local `path`, a git ref, or the crates.io
registry.

At generate time the engine topologically sorts the registered plugins
(honoring `after` / `before`), then for each one spawns the subprocess
and exchanges the JSON envelope, merging the mutated context — including
journal entries — back into the running pipeline. From the engine's
view a subprocess plugin behaves exactly like an in-process one. Two
plugins discovered with the same `name` is a hard error.

## Registering the plugin (consumer side)

There are no `Podfile`, `Package.swift`, or `build.gradle` edits on the
consumer side. The app adds the crate as a dependency and opts the
plugin in from `whisker.rs`:

```toml
# app/Cargo.toml
[dependencies]
whisker-foo = "0.1"
```

```rust
// app/whisker.rs
pub fn configure(app: &mut whisker_config::Config) {
    app.name("My App")
        .bundle_id("rs.example.myapp");

    app.plugin::<whisker_foo::WhiskerFoo>(|c| {
        c.camera_permission("Scan QR codes to pair devices.")
            .analytics_android(true);
    });

    // A plugin that takes no config still goes through the same call —
    // the closure body is just empty.
    app.plugin::<whisker_other::WhiskerOther>(|_| {});
}
```

The closure starts from `Config::default()` and mutates it in place; the
result is stored under `plugins[PluginConfig::NAME]`. See
[`app.plugin::<P>`](/docs/configuration-api#registering-plugins) in the
Configuration reference for the registration API.

## A real example: `whisker-audio`

`whisker-audio` is the canonical "module + plugin in one crate" example.
Its plugin contributes the iOS microphone usage description and the
Android `RECORD_AUDIO` permission. Pointing at the real source:

- `packages/whisker-audio/src/plugin.rs` — `WhiskerAudio` +
  `WhiskerAudioConfig`, four fluent setters, and an `apply` that writes
  `NSMicrophoneUsageDescription` / `UIBackgroundModes` (iOS) and
  `android.permission.RECORD_AUDIO` (Android). With no opt-in, the
  default config contributes nothing.

Registered from the consumer's `whisker.rs`:

```rust
app.plugin::<WhiskerAudio>(|c| c
    .microphone_permission("Record audio clips for podcasts.")
    .record_audio_android(true));
```

## Where to go next

- [Plugin API reference](/docs/plugin-api) — the full type catalog:
  `GenerateContext`, both project IRs, `PlistValue`, `PbxprojOp`,
  `MetaDataEntry`, `FileEntry`, the journal types, and the subprocess
  envelopes.
- [Configuration](/docs/configuration-api) — the `whisker.rs` `Config`
  surface and `app.plugin::<P>`.
- [Modules & Plugins](/docs/modules-and-plugins) — the module-vs-plugin
  mental model.
- [Authoring a Module](/docs/authoring-a-module) — when you need a
  runtime capability instead.
- [First-party Modules](/docs/modules-api) — worked examples, including
  `whisker-audio`.
