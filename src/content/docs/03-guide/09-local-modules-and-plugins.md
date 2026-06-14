---
title: Local Modules & Plugins
description: Author your own native module or plugin in-tree, as part of your project, without publishing it.
order: 9
---

# Local Modules & Plugins

Sometimes you need a native widget, a native API, or a permission **for one
app** — code that should live inside your project, not on crates.io. This is
the same idea as **Expo's local modules**: you author your own Whisker
module or plugin *in-tree*, as part of your app, and the build wires its
native (Swift/Kotlin) side automatically.

You don't write any registration or linking glue. As with a published
module, the build **autolinks** it: it walks your app's cargo dependency
graph and wires the native side of every dependency that carries the
Whisker marker — whether that dependency came from crates.io or from a
local `path`. A local module is just a module crate that happens to live in
your repo.

## Scaffold it with `whisker new-module`

`whisker new-module` generates a complete, ready-to-build module crate —
Rust + Swift + Kotlin, in the Expo-style layout (manifest at the crate
root, platform code in `ios/` and `android/`):

```sh
# create a module crate at ./modules/whisker-qr-scanner/
whisker new-module whisker-qr-scanner --path modules
```

- `<name>` — the cargo crate name (kebab-case; the `whisker-` prefix is the
  convention).
- `--path <dir>` — the **parent** directory the crate is created in; the
  crate lands at `<dir>/<name>/`. Defaults to the current directory. Point
  it anywhere inside your repo to keep the module local.
- `--shape view-bearing` (default) scaffolds a module that renders a native
  view; `--shape function-only` scaffolds a view-less module that just
  exposes native functions/signals (like `whisker-safe-area`).

> There is no `--local` flag. "Local" simply means you scaffold the crate
> inside your repo and depend on it by `path` — there's nothing else to
> opt into.

It generates roughly:

```
modules/whisker-qr-scanner/
├── Cargo.toml            # carries the [package.metadata.whisker] marker
├── Package.swift         # SwiftPM target → ios/Sources/…
├── build.gradle.kts      # AGP library + KSP → android/…
├── src/lib.rs            # your #[whisker::module_component]
├── ios/Sources/WhiskerQrScanner/…Module.swift  (+ …View.swift)
└── android/src/main/kotlin/rs/whisker/modules/qr_scanner/…Module.kt
```

The crate's internals — the `#[whisker::module_component]`, the Swift/Kotlin
sides — are exactly what [Authoring a Module](/docs/authoring-a-module)
covers. Treat that guide as the "how to fill in the crate" companion to
this one.

## Wire it into your app

Add it as a **path dependency**. That's the whole wiring step — autolinking
does the rest:

```sh
cargo add --path modules/whisker-qr-scanner
```

```toml
# your app's Cargo.toml
[dependencies]
whisker-qr-scanner = { path = "modules/whisker-qr-scanner" }
```

On the next `whisker run`, discovery walks the dependency graph, finds
`whisker-qr-scanner` by its `[package.metadata.whisker]` marker, and
compiles + links its `ios/` and `android/` sources into the app. It makes
no difference that the crate resolved from a local `path` rather than the
registry — the marker is all that matters. If the module later proves
generally useful, `cargo publish` it and consumers swap the `path` for a
version; nothing else changes.

## The one rule: it's still its own crate

This is the constraint that trips people up coming from a "just add it to my
app" mindset:

> You **cannot** define a working module or plugin inline in your app crate.
> It must live in a separate crate — even if that crate sits right next to
> your app in the same repo.

Discovery walks your app's cargo dependency graph and **deliberately skips
the root app package** (it's excluded by package id, not by a missing
marker). So if you put a `#[whisker::module_component]` directly in your
app's `src/lib.rs`, the Rust compiles — but its native code is **never
wired**, because the app crate is never visited during discovery. At runtime
the element won't render. The fix is always: move it into its own crate
(local or published) and depend on it.

This is exactly what `whisker new-module` sets you up for — a standalone
crate you path-depend on, not app-crate code.

## Local plugins work the same way

A plugin (a native capability + permissions, run in a sandboxed subprocess —
see [Authoring a Plugin](/docs/authoring-a-plugin)) is also just a crate you
author in-tree and path-depend on. The only differences from a module are
the marker table and a `[[bin]]`:

```toml
# modules/whisker-qr-permissions/Cargo.toml
[package.metadata.whisker]

[package.metadata.whisker.plugins.whisker-qr-permissions]
bin = "whisker-qr-permissions-plugin"

[[bin]]
name = "whisker-qr-permissions-plugin"
path = "bin/whisker_qr_permissions_plugin.rs"
test = false
bench = false
```

The `<name>` in `[package.metadata.whisker.plugins.<name>]` must equal the
plugin type's `NAME`. Add the `path` dependency, then configure the plugin
from your app's `whisker.rs` — this `app.plugin::<T>(…)` call is the only
registration you write by hand (it sets the plugin's config; without it the
plugin still runs but with defaults):

```rust
// app/whisker.rs
app.plugin::<whisker_qr_permissions::QrPermissions>(|c| {
    c.camera_permission("Scan QR codes to pair devices.");
});
```

You **cannot** `impl Plugin` in `whisker.rs` or the app crate — like
modules, the plugin type must come from a discovered dependency crate (the
config probe that runs `whisker.rs` only has the discovered plugin crates
available, not your app crate).

## Recommended layout

Keep your in-tree modules and plugins together — an Expo-style `modules/`
folder is a clean convention (the directory name is up to you; `--path`
takes anything):

```
my-app/
├── Cargo.toml            # [dependencies] whisker-qr-scanner = { path = "modules/whisker-qr-scanner" }
├── whisker.rs            # app.plugin::<…>(…)
├── src/
│   └── lib.rs            # your app — no module_component / Plugin impls here
└── modules/
    ├── whisker-qr-scanner/       # a local module crate (whisker new-module …)
    │   ├── Cargo.toml            #   [package.metadata.whisker]
    │   ├── Package.swift
    │   ├── build.gradle.kts
    │   ├── src/lib.rs
    │   ├── ios/
    │   └── android/
    └── whisker-qr-permissions/   # a local plugin crate
        ├── Cargo.toml            #   [package.metadata.whisker.plugins.…] + [[bin]]
        ├── src/lib.rs
        └── bin/
```

The repo's own `packages/whisker-*` crates (e.g. `whisker-safe-area`,
`whisker-audio`) are real working examples of this exact shape — each is a
standalone module/plugin crate, consumed by its example app via a `path`
dependency.

## Monorepo / local-development caveat

This caveat only applies when you run an example or app **inside the Whisker
monorepo itself** — a normal external app on a published `whisker` CLI is
unaffected.

When developing inside the monorepo, use a **locally-built CLI** so the
config probe resolves the workspace's local `whisker-config` instead of a
crates.io copy:

```sh
cargo install --path crates/whisker-cli
# or run the debug binary directly:
target/debug/whisker run ios
```

A published `whisker` CLI can pull a mismatched `whisker-config` /
`whisker-plugin` into the probe and fail to build it. Outside the monorepo
— a real app on a released CLI — versions resolve normally and there's
nothing to do.

## Where to go next

- [Authoring a Module](/docs/authoring-a-module) — how to fill in the module
  crate `whisker new-module` scaffolds (the `module_component`, the
  Swift/Kotlin sides).
- [Authoring a Plugin](/docs/authoring-a-plugin) — the plugin crate's
  internals, the `[[bin]]` entrypoint, and the
  `[package.metadata.whisker.plugins.<name>]` marker.
- [Modules & Plugins](/docs/modules-and-plugins) — the module-vs-plugin
  mental model and why distribution works the way it does.
