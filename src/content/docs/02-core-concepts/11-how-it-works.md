---
title: How It Works
description: Lynx rendering, the crate graph, and the dev loop.
order: 11
---

# How It Works

You write a Whisker app entirely in Rust — components, signals,
`render!` trees. But the pixels on screen are real native widgets. This
page is the "what's under the hood" tour: how Rust UI ends up driving
native views, how the workspace is sliced into crates, and what `whisker
run` actually does between you saving a file and the screen updating.

It's intentionally high-level. The reference pages linked throughout go
into the precise APIs.

## Rust UI on top of Lynx

Whisker runs your Rust UI on top of the **Lynx** C++ engine. Lynx is not
a JavaScript runtime, and Whisker is not a self-rendered canvas — Lynx
drives *real native widgets* (`UIView` on iOS, Android `View`s), handling
layout, paint, and the native view hierarchy.

The division of labour:

- **Your Rust code** owns the logic and the view *description*.
  Components are plain functions; [signals](/docs/reactivity-api) hold
  state; [`render!`](/docs/components) builds an element tree.
- **The Whisker runtime** maintains that element tree, runs the
  fine-grained reactive updates, and diffs one frame against the next.
- **Lynx** takes the resulting changes and turns them into native view
  operations — sizing with flexbox, painting, mounting and unmounting
  actual platform views.

So a `view` or `text` in `render!` isn't a Whisker-drawn rectangle; it's
a description that Lynx realises as a native widget. That's why styling
is CSS-shaped and layout is flexbox — those are Lynx's model, surfaced
through Whisker's typed API.

## The crate graph

The workspace is split into several crates, but app code only ever sees
one of them.

- **`whisker`** is the umbrella crate. It re-exports the **runtime** (the
  reactive arena and view layer), the **driver** (the safe wrappers over
  the Lynx bridge), and the **macros** (`#[whisker::main]`, `render!`).
  Your app does `use whisker::prelude::*;` and never touches the inner
  crates directly.
- **`whisker-runtime`** is the element tree, diff, and reactive signals —
  renderer-agnostic, with no knowledge of Lynx.
- **`whisker-driver`** holds the Lynx backend: safe Rust wrappers over an
  unsafe `*-sys` layer of `extern "C"` declarations that match the C++
  bridge.
- **`whisker-config`** carries the small set of app-metadata types you
  build in `whisker.rs`. It's kept deliberately tiny so the config
  probe (more below) builds in seconds, not minutes.

The umbrella shape means upgrading Whisker is a single version bump, and
the prelude is the entire public surface most apps ever need. (Native
capabilities arrive as separate crates — see
[Modules & Plugins](/docs/modules-and-plugins).)

## The `whisker run` dev loop

`whisker run` is the development workflow: it watches your source,
rebuilds, installs, and launches, then keeps watching. The interesting
part is what happens on each subsequent save.

```
        you edit src/lib.rs
                  │
                  ▼
        file watcher  →  rebuild  →  install  →  launch
                  │
                  └─ on later edits: hot reload
```

There are two tiers:

- **Tier 1 — hot reload.** For a function-body change, Whisker compiles
  just the changed code into a thin patch and ships it to the running app
  over a WebSocket, where it's applied live (via the in-tree `subsecond`
  engine). No reinstall, no restart — typically sub-second. This is the
  common path while iterating on UI and logic.
- **Tier 2 — full rebuild.** When a change can't be hot-patched (new
  dependencies, signature changes, native config), Whisker falls back to
  a complete rebuild, install, and relaunch.

The walkthrough — what hot reload can and can't patch, and how to drive
it — is in the [Hot Reload](/docs/hot-reload) guide, and every flag of
the command itself is in the [CLI reference](/docs/cli-reference).

> Behind the scenes the CLI first runs a *config probe*: it compiles and
> runs your `whisker.rs` to produce the app's `Config`, then hands the
> flat result to the dev loop. That probe depends only on the tiny
> `whisker-config` crate, which is why it stays fast.

## Distribution at a glance

The split between how the core and how modules are shipped is worth
holding in your head:

- **The core runtime** is distributed as a remote **SwiftPM** package on
  iOS (resolved by tagged git URL) and as **Maven** AARs on Android.
  Generated native projects reference it at a single stable version.
- **Modules** are distributed on **crates.io**: a module crate bundles
  its Swift and Kotlin sources in the published package, and the build
  consumes them straight from the cargo registry. One `cargo publish`
  ships all three languages.

The full reasoning — and why a module needs *no* separate SwiftPM/Maven
publishing — is in [Modules & Plugins](/docs/modules-and-plugins).
