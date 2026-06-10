---
title: Overview & Prelude
description: How Whisker's public API is organized, and everything the prelude brings into scope.
order: 1
---

# API Reference: Overview & Prelude

The `whisker` crate is an **umbrella**: almost every type, macro, and
function you use comes from a more specialized companion crate, surfaced
through a single import root so app code never needs to know which inner
crate owns which symbol.

For day-to-day app code, one import is enough:

```rust
use whisker::prelude::*;
```

This page lists what the prelude brings into scope and where to find the
rest. Each linked page documents the symbols in full.

## What the prelude imports

| Group | Symbols | Reference |
|---|---|---|
| **Macros** | `main`, `component`, `render`, `css` | [Macros](/docs/macros) |
| **Element** | `Element`, `ElementTag` | [Elements](/docs/elements) |
| **Built-in tags** | `page`, `view`, `text`, `raw_text`, `scroll_view`, `list`, `fragment` | [Elements](/docs/elements) |
| **Reactivity** | `signal`, `RwSignal`, `ReadSignal`, `WriteSignal`, `arc_signal`, `ArcRwSignal`, `ArcReadSignal`, `ArcWriteSignal`, `computed`, `effect`, `resource`, `resource_sync`, `Resource`, `ResourceState`, `StoredValue`, `Signal` | [Reactivity](/docs/reactivity-api) |
| **Lifecycle & context** | `on_mount`, `on_cleanup`, `provide_context`, `use_context`, `with_context` | [Reactivity](/docs/reactivity-api) |
| **Control flow** | `Show`, `ForEach` (+ `EachFn`, `KeyFn`, `ItemFn`, `WhenFn`, `Fallback`, `Children`) | [Control Flow](/docs/control-flow) |
| **Refs** | `ElementRef`, `ElementHandle`, `ScrollViewHandle`, `TextHandle`, `BoundingClientRect`, `ScrollInfo`, `TextBoundingRect`, `RefError` | [Imperative & Refs](/docs/refs) |
| **CSS** | `Css`, `css!`, `Color`, `NamedColor`, `Length`, `Display`, `FlexDirection`, `FlexWrap`, `AlignItems`, `JustifyContent`, `Border`, `Flex`, `ToCss`, and the unit extension traits (`.px()`, `.rem()`, …) | [CSS](/docs/css) |
| **Attributes** | `AccessibilityTrait`, `ListType`, `PanInterceptDirection`, `PanInterceptScope`, `ScrollOrientation`, `TextVerticalAlign` | [Attributes](/docs/attributes) |

> Not everything lives in the prelude. Async helpers, platform modules,
> imperative animation, and the lower-level runtime are reachable through
> the namespaces below.

## Namespaces beyond the prelude

| Path | Contents | Reference |
|---|---|---|
| `whisker::event` | Typed event objects (`TouchEvent`, `ScrollEvent`, …) handed to `on_<event>` handlers | [Events](/docs/events) |
| `whisker::module!` + `whisker::PlatformModule` | Function-shaped native module calls + the universal `WhiskerValue` | [Platform Modules](/docs/platform-modules) |
| `whisker::runtime::tasks` | `spawn_local`, `run_blocking`, `run_on_main_thread` | [Tasks & Threading](/docs/tasks) |
| `whisker::config` | The `Config` types used in `whisker.rs` | [Configuration](/docs/configuration-api) |
| `whisker::runtime` / `whisker::owner` | Framework-extension surface — `Owner`, custom control flow, custom renderers | [Reactivity](/docs/reactivity-api) |

## Companion crates

These are separate crates you add to `Cargo.toml` as needed:

| Crate | What it provides | Reference |
|---|---|---|
| `whisker-router` | Type-safe, signal-backed routing | [Routing](/docs/routing-api) |
| `whisker-image` / `whisker-svg` / `whisker-icons` / `whisker-video` / `whisker-audio` / `whisker-safe-area` / `whisker-local-store` | First-party native modules | [First-party Modules](/docs/modules-api) |
| `whisker-plugin` | Author a plugin that contributes to the generated native project | [Plugin API](/docs/plugin-api) |

## A note on macro names

The proc macros that actually exist are **`main`**, **`component`**,
**`module_component`**, **`render`**, and **`css`**, plus the
**`module!`** declarative macro. (Older prose occasionally mentions a
`#[whisker::platform_module]` macro — it does not exist; native view
modules use `#[whisker::module_component]`.)
