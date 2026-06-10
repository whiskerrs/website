---
title: Modules & Plugins
description: How Whisker extends to native capabilities.
order: 10
---

# Modules & Plugins

The Whisker core stays small on purpose. Anything that needs a real
native widget, a platform service, or a tweak to the generated native
project comes from one of two extension mechanisms: a **module** or a
**plugin**. They sound similar but solve different problems — a module
adds *code* (a capability your app calls or renders), while a plugin
adds *native project configuration* (Info.plist keys, permissions,
Gradle deps).

This page explains the mental model. When you're ready to build one,
see [Authoring a Module](/docs/authoring-a-module) and
[Authoring a Plugin](/docs/authoring-a-plugin).

## Whisker modules

A **Whisker module** is a single cargo crate that ships Rust, Swift, and
Kotlin *together* to expose one native capability. From your app you add
it to `Cargo.toml` like any other dependency, `use` its types, and the
build wires the native side in for you.

Modules come in two flavours:

- **A native view** — a component you drop into `render!` as a tag. For
  example, [`whisker-image`](/docs/modules-api)'s `Image` is a real
  native image view (Kingfisher on iOS, Coil on Android) that takes part
  in layout like any other element:

  ```rust
  use whisker_image::{Image, ImageMode};

  render! {
      Image(src: "https://example.com/cover.jpg",
            mode: ImageMode::AspectFill,
            style: "width: 240px; height: 240px;")
  }
  ```

- **A function-shaped module** — a native capability with no view of its
  own, called from Rust. Under the hood these dispatch through
  [`module!` / `PlatformModule`](/docs/platform-modules); the first-party
  crates wrap that raw surface in a typed API. For example,
  `whisker-audio`'s `Player` handle drives playback and exposes a
  reactive status signal.

The first-party module crates — image, svg, icons, video, audio,
safe-area, local-store — are documented in
[First-party Modules](/docs/modules-api). They double as worked examples
of every module shape.

### How a module is distributed

This is the key mental model, and it differs from how the core is
shipped.

**A module's native sources travel on crates.io.** Each module crate's
`Cargo.toml` declares an explicit `include` list that bundles the Swift
and Kotlin sources alongside `src/lib.rs`:

```toml
# packages/whisker-image/Cargo.toml
include = [
    "Cargo.toml",
    "Package.swift",
    "build.gradle.kts",
    "src/lib.rs",
    "android/**/*.kt",
    "ios/**/*.swift",
    "README.md",
]
```

When `cargo publish` packs the crate, those `ios/**/*.swift`,
`android/**/*.kt`, `Package.swift`, and `build.gradle.kts` files go with
it. The Whisker build then consumes them straight out of the cargo
registry extraction — it walks your dependency tree, finds every crate
carrying the `[package.metadata.whisker]` marker, and wires its Android
Gradle subproject and iOS SwiftPM package into the host build. **No
separate SwiftPM Registry or Maven Central publishing is needed for a
module.** One `cargo publish` ships all three languages.

Contrast this with the **core runtime**. The Swift/Kotlin runtime that
every app links against is *not* shipped this way — it's distributed as
a remote SwiftPM package (resolved by tagged git URL on iOS) and as
Maven AARs on Android. The reason is that static, generated native
project manifests need a single stable reference to the runtime: every
module's `Package.swift` points at the *same* remote `whisker` package
URL so the build graph ends up with one shared runtime identity rather
than a copy per module. Modules ride on crates.io; the core runtime they
all depend on lives behind a versioned remote package.

## Whisker plugins

A **Whisker plugin** doesn't add a capability your code calls — it
contributes to the *generated native project* during `whisker run` or a
build. Plugins are how you reach into the parts of the iOS/Android
project Whisker generates: `Info.plist` keys, Android manifest
permissions, Gradle plugins and dependencies, and arbitrary extra files.

A plugin is a cargo crate too, but you opt into it explicitly in your
`whisker.rs`:

```rust
app.plugin::<WhiskerAudio>(|c| c
    .microphone_permission("Record audio clips for podcasts.")
    .record_audio_android(true));
```

During generation the build runs each registered plugin against an
in-memory representation of the native project, letting it set plist
values, push permissions, and so on. The full surface — the `Plugin`
trait, the per-platform IR it mutates — is in the
[Plugin API](/docs/plugin-api); registering one is covered in
[Configuration](/docs/configuration-api).

## A crate can be both

The two mechanisms compose. `whisker-audio` ships **both**:

- a *module* — the `Player` handle and the native audio engine behind
  it, and
- a *plugin* — `WhiskerAudio`, which contributes the microphone usage
  description (iOS) and the `RECORD_AUDIO` permission (Android) needed
  before the engine can record.

Adding the dependency gives you the `Player` API immediately; the
permission entries only appear once you register the plugin in
`whisker.rs`. With no opt-in the plugin runs with its defaults and
contributes nothing — you don't pay for permissions you didn't ask for.

## Which one do I write?

A quick rule of thumb:

- **Module** — you're adding a *capability your code uses*: a native
  widget to render, or a native function/service to call. It ships Rust
  + Swift + Kotlin and is consumed as a normal crate dependency.
- **Plugin** — you're adjusting the *native project itself*: a
  permission, a plist key, a Gradle dependency, an extra bundled file.

If you need both — a capability *and* the project config that lets it
run — ship both from the same crate, as `whisker-audio` does.

When you're ready, head to [Authoring a Module](/docs/authoring-a-module)
or [Authoring a Plugin](/docs/authoring-a-plugin).
