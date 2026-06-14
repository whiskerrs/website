---
title: Introduction
description: What Whisker is and why you'd build your next mobile app with it.
order: 1
---

# Introduction

**Whisker is a Rust-first framework for building native Android and iOS
apps.** You write the UI, the state graph, your business logic, and your
native calls in one systems language — no JavaScript runtime, no Dart VM,
no scripting layer.

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    let count = RwSignal::new(0);

    render! {
        page(style: css!(display: Display::Flex, flex_direction: FlexDirection::Column, gap: 12.px())) {
            text(value: format!("Count: {}", count.get()))
            view(on_tap: move |_| count.update(|n| *n += 1)) {
                text(value: "+1")
            }
        }
    }
}
```

## Why Whisker

- **One language, end to end.** Rust is the application language, not a
  native escape hatch. Props, state, and platform calls are all typed.
- **Native output.** Whisker renders through the
  [Lynx](https://github.com/lynx-family/lynx) engine, which drives **real
  native widgets** — not a self-rendered canvas.
- **Fine-grained reactivity.** Components run once; signals and effects
  update only the exact attributes that changed. No virtual DOM, no
  re-render passes.
- **Ergonomic UI.** The `render!` macro reads like markup while Rust
  keeps everything safe and checked.
- **Sub-second hot reload.** Built for the Rust edit-debug loop: save a
  file and the running app updates, usually in under a second.

## How it compares

| | Whisker | Flutter | React Native |
|---|---|---|---|
| Language | Rust | Dart | TypeScript / JavaScript |
| Rendering | Native widgets (Lynx) | Self-rendered (Skia/Impeller) | Native widgets |
| Runtime dependency | None | Dart VM | JS engine |
| Reactivity | Fine-grained signals | Widget rebuilds | Component re-render + diff |

## What's here today

Whisker is in active early release. The core is solid and used to build
real apps:

- Components, the `render!` macro, and fine-grained signals
- Styling via a typed `css!` macro on the Lynx layout engine
- Routing, lists, images, SVG, icons, video, audio, safe-area, and
  local storage as first-party modules
- iOS and Android builds with sub-second hot reload

A few things aren't there yet — most notably there's **no text-input
element**, and deep linking is stubbed. The docs call these out where
they're relevant so you're never surprised.

## Where to go next

- [Installation](/docs/installation) — set up the toolchain.
- [Your First App](/docs/your-first-app) — scaffold and run an app.
- [Components & `render!`](/docs/components) — start building UI.
