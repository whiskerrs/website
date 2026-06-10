---
title: Plugin API
description: Author a plugin that contributes to the generated native project.
order: 15
---

# API Reference: Plugin API

A Whisker **plugin** mutates the native project Whisker generates — the
iOS `Info.plist` and xcodeproj, the Android manifest and Gradle DSL, and
arbitrary extra files. Plugins are declared in `whisker.rs` via
[`app.plugin::<P>(|c| …)`](/docs/configuration-api#registering-plugins);
the generation engine runs each one against an in-memory IR.

This page is the reference for the `whisker-plugin` crate. For a
step-by-step walkthrough see the authoring guide; for the consumer side
(declaring a plugin in `whisker.rs`) see
[Configuration](/docs/configuration-api).

## Skeleton

A plugin is two pieces: a `Config` struct that names the plugin, and a
unit struct that owns the `apply` logic. A third-party plugin ships as a
binary that calls [`run_as_subprocess`](#run_as_subprocess) from `main`.

```rust
use whisker_plugin::{
    GenerateContext, Operation, PlistValue, Plugin, PluginConfig, Target,
};

#[derive(Default, serde::Serialize, serde::Deserialize)]
struct DemoConfig {
    bundle_suffix: String,
}

impl PluginConfig for DemoConfig {
    const NAME: &'static str = "example-plugin";
}

struct Demo;

impl Plugin for Demo {
    type Config = DemoConfig;

    fn apply(&self, ctx: &mut GenerateContext, cfg: &DemoConfig) -> anyhow::Result<()> {
        if let Some(ios) = ctx.ios.as_mut() {
            let key = "CFBundleSuffix".to_string();
            ios.info_plist
                .insert(key.clone(), PlistValue::String(cfg.bundle_suffix.clone()));
            ctx.journal
                .record(DemoConfig::NAME, Target::Ios, &format!("info_plist.{key}"), Operation::Set);
        }
        Ok(())
    }
}

fn main() -> anyhow::Result<()> {
    whisker_plugin::run_as_subprocess(Demo)
}
```

## Core traits

### `PluginConfig`

```rust
pub trait PluginConfig: Serialize + for<'de> Deserialize<'de> + Default {
    const NAME: &'static str;
}
```

The typed config struct each plugin defines. `NAME` is the stable
kebab-case identifier (prefix first-party plugins with `whisker-`); it is
the key under which the config is stored in `Config::plugins` and the
default value of [`Plugin::name`](#plugin). The `Serialize + Deserialize +
Default` bounds let the config cross the JSON wire and start from a
no-options default.

### `Plugin`

| Member | Signature | Default | Notes |
|---|---|---|---|
| `type Config` | `: PluginConfig` | — | This plugin's config type. |
| `name` | `fn name(&self) -> &'static str` | `Self::Config::NAME` | Stable identifier used in journal, errors, and ordering. |
| `after` | `fn after(&self) -> &'static [&'static str]` | `&[]` | Plugins this one must run after. |
| `before` | `fn before(&self) -> &'static [&'static str]` | `&[]` | Plugins this one must run before. |
| `validate` | `fn validate(&self, &Self::Config) -> anyhow::Result<()>` | `Ok(())` | Reject bad config before any mutation fires. |
| `apply` | `fn apply(&self, &mut GenerateContext, &Self::Config) -> anyhow::Result<()>` | required | Mutate the IR. |

## `GenerateContext`

The mutable handle passed to `apply`. Each target IR is `Option` because a
given run may target only one platform — branch with
`if let Some(ios) = ctx.ios.as_mut() { … }`.

| Field | Type | Notes |
|---|---|---|
| `app_meta` | [`AppMeta`](#appmeta) | Read-only snapshot of user-spelled config. |
| `ios` | `Option<IosProjectIr>` | `Some` when iOS is being generated. |
| `android` | `Option<AndroidProjectIr>` | `Some` when Android is being generated. |
| `journal` | [`MutationJournal`](#mutation-journal) | Append-only attribution log. |

### `AppMeta`

Frozen at pipeline entry; plugins read it but don't update it. Use the
per-target IR for values the renderer eventually consumes.

| Field | Type |
|---|---|
| `name` | `String` |
| `version` | `String` |
| `build_number` | `u32` |
| `ios_bundle_id` | `Option<String>` |
| `android_application_id` | `Option<String>` |

## iOS IR

### `IosProjectIr`

Core fields are seeded from `Config` before any plugin runs; a plugin may
read them or override them (recording `Operation::Override`).

| Field | Type | Notes |
|---|---|---|
| `app_name` | `Option<String>` | `PRODUCT_NAME` / `CFBundleDisplayName` source. |
| `version` | `Option<String>` | `CFBundleShortVersionString` source. |
| `build_number` | `Option<u32>` | `CFBundleVersion` source. |
| `bundle_id` | `Option<String>` | `PRODUCT_BUNDLE_IDENTIFIER` source. |
| `scheme` | `Option<String>` | Xcode scheme name. |
| `deployment_target` | `Option<String>` | `IPHONEOS_DEPLOYMENT_TARGET` source. |
| `info_plist` | `BTreeMap<String, PlistValue>` | `Info.plist` object tree. |
| `pbxproj_ops` | `Vec<PbxprojOp>` | Deferred xcodeproj structural ops. |
| `extra_files` | `BTreeMap<PathBuf, FileEntry>` | Files dropped into `gen/ios/`. |

### `PlistValue`

Tagged-union value for plist trees (`{ "type": …, "value": … }`).

| Variant | Payload |
|---|---|
| `String` | `String` |
| `Integer` | `i64` |
| `Real` | `f64` |
| `Boolean` | `bool` |
| `Array` | `Vec<PlistValue>` |
| `Dict` | `BTreeMap<String, PlistValue>` |

### `PbxprojOp`

Structural mutation request replayed against the pbxproj renderer.

| Variant | Fields | Notes |
|---|---|---|
| `AddResource` | `{ path: PathBuf }` | Add to the Resources build phase. |
| `AddSource` | `{ path: PathBuf }` | Add a compiled source file. |
| `SetBuildSetting` | `{ key: String, value: String }` | Add a build setting (Debug + Release). |
| `LinkSystemFramework` | `{ name: String }` | Add a system framework to Link Binary With Libraries. |

## Android IR

### `AndroidProjectIr`

| Field | Type | Notes |
|---|---|---|
| `app_name` | `Option<String>` | Activity label source. |
| `version` | `Option<String>` | Gradle `versionName` source. |
| `build_number` | `Option<u32>` | Gradle `versionCode` source. |
| `application_id` | `Option<String>` | Gradle `applicationId` source. |
| `min_sdk` | `Option<u32>` | Gradle `minSdk` source. |
| `target_sdk` | `Option<u32>` | Gradle `targetSdk` source. |
| `manifest` | [`AndroidManifest`](#androidmanifest) | Structured `AndroidManifest.xml` model. |
| `gradle` | [`GradleDsl`](#gradledsl) | App-module Gradle additions. |
| `extra_files` | `BTreeMap<PathBuf, FileEntry>` | Files dropped into `gen/android/`. |

### `AndroidManifest`

| Field | Type | Notes |
|---|---|---|
| `permissions` | `Vec<String>` | `<uses-permission>` entries; dedup'd at render. |
| `application_meta_data` | `Vec<MetaDataEntry>` | `<meta-data>` entries inside `<application>`. |

### `MetaDataEntry`

| Field | Type |
|---|---|
| `name` | `String` |
| `value` | `String` |

### `GradleDsl`

| Field | Type | Notes |
|---|---|---|
| `apply_plugins` | `Vec<String>` | Plugin ids for the app module's `plugins { }` block. |
| `dependencies` | `Vec<String>` | Raw DSL lines for the `dependencies { }` block. |

## Shared types

### `FileEntry`

| Field | Type | Notes |
|---|---|---|
| `contents` | `String` | UTF-8 file contents. |
| `mode` | `Option<u32>` | POSIX mode bits; `None` → engine default (`0o644`). |

### `Target`

`enum Target { Ios, Android }` — names the platform a mutation touched.

### `Operation`

Recorded alongside each mutation so the engine can attribute conflicts.

| Variant | Fields | Notes |
|---|---|---|
| `Set` | — | First write to an unset field. Two `Set`s to the same path conflict. |
| `Override` | — | Explicitly overwrites a prior value. |
| `ArrayPush` | `{ count: usize }` | Appended items to an array-shaped field. |

### `MutationRecord`

| Field | Type | Notes |
|---|---|---|
| `plugin` | `String` | `Plugin::name()` of the mutating plugin. |
| `target` | `Target` | Platform touched. |
| `path` | `String` | Dotted path, e.g. `"info_plist.CFBundleIdentifier"`. |
| `operation` | `Operation` | Kind of mutation. |
| `sequence_index` | `u64` | Monotonic per-pipeline counter. |

### Mutation journal

```rust
pub struct MutationJournal {
    pub records: Vec<MutationRecord>,
    pub next_sequence_index: u64,
}
```

Record every IR mutation alongside the mutation itself:

```rust
ctx.journal.record(
    Plugin::name(self),     // or Config::NAME
    Target::Android,
    "manifest.permissions",
    Operation::ArrayPush { count: 1 },
);
```

`record` allocates the next sequence index and appends a
[`MutationRecord`](#mutationrecord). The engine inspects the log to detect
conflicts and produce verbose summaries.

## Subprocess IPC

Third-party plugins run as subprocesses: the engine writes a
[`PluginRequest`](#pluginrequest) as JSON to stdin and reads a
[`PluginResponse`](#pluginresponse) from stdout. Stdout is strictly the
response envelope; stderr is reserved for human-readable diagnostics.

### `PluginRequest`

| Field | Type | Notes |
|---|---|---|
| `name` | `String` | Plugin name the engine is asking for. |
| `config` | `serde_json::Value` | The plugin's config as JSON (`null` → `Default`). |
| `context` | `GenerateContext` | The IRs going into this plugin. |

### `PluginResponse`

| Field | Type | Notes |
|---|---|---|
| `context` | `GenerateContext` | The post-mutation context. |

### `run_as_subprocess`

```rust
pub fn run_as_subprocess<P: Plugin>(plugin: P) -> anyhow::Result<()>;
```

Reads a `PluginRequest` from stdin, asserts the name matches, decodes the
config (or uses `Default` when `null`), runs `validate` then `apply`, and
writes a `PluginResponse` to stdout. The recommended `main`:

```rust
fn main() -> anyhow::Result<()> {
    whisker_plugin::run_as_subprocess(Demo)
}
```

A returned error exits with status 1 and the message on stderr — the
contract the engine expects.
