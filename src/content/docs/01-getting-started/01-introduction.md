---
title: Introduction
description: What Whisker is and how one Rust UI runs on mobile, web, and desktop.
order: 1
---

# Introduction

**Whisker is a Rust-first framework for building iOS, Android, Web, and
Desktop apps.** Application state, UI declarations, layout, and frame
production stay in Rust. Each platform Host turns the same semantic frame into
UIKit views, Android views, DOM nodes, or wgpu drawing.

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    let count = signal(0);

    render! {
        View(style: css!(
            flex_grow: 1.0,
            display: Display::Flex,
            flex_direction: FlexDirection::Column,
            gap: px(12),
        )) {
            Text(value: computed(move || format!("Count: {}", count.get())))
            View(on_tap: move |_| count.update(|n| *n += 1)) {
                Text(value: "+1")
            }
        }
    }
}
```

## Why Whisker

- **One application language.** Rust is the application language, not a
  native escape hatch. Props, state, styling, and module values are typed.
- **A small retained core.** Rust owns the element tree, Taffy layout,
  scheduling, input routing, and the platform-neutral frame protocol. There is
  no JavaScript runtime, Dart VM, virtual DOM, or Lynx dependency.
- **Purpose-built Hosts.** iOS and Android project frames into native view
  hierarchies, Web projects them into the DOM, and Desktop paints with wgpu.
  Host-backed module elements can still embed controls such as text input,
  video, maps, or toggles.
- **Fine-grained reactivity.** Components run once; signals and effects
  update only the exact attributes that changed. No virtual DOM, no
  re-render passes.
- **Ergonomic UI.** The `render!` macro reads like markup while Rust
  keeps everything safe and checked.
- **Sub-second hot reload.** Built for the Rust edit-debug loop: save a
  file and the running app updates, usually in under a second.

## How it compares

|                    | Whisker                             | Flutter                       | React Native               |
| ------------------ | ----------------------------------- | ----------------------------- | -------------------------- |
| Language           | Rust                                | Dart                          | TypeScript / JavaScript    |
| Rendering          | Rust frame protocol + platform Host | Self-rendered (Skia/Impeller) | Fabric native components   |
| Runtime dependency | Native Rust library                 | Dart VM                       | JS engine                  |
| Reactivity         | Fine-grained signals, no VDOM       | Widget rebuilds               | Component re-render + diff |

## What's here today

Whisker is in active early release. The core is solid and used to build
real apps:

- Components, the `render!` macro, and fine-grained signals
- Structured styling through `css!` or the public `Css` builder, with Taffy
  layout and Host paint
- Routing, lists, images, SVG, icons, video, audio, safe-area, and
  local storage as first-party modules
- iOS, Android, Web, and Desktop run/build paths with sub-second hot reload

Whisker is pre-alpha. APIs and exact platform coverage can still change; pages
call out platform-specific limitations where they matter.

## Where to go next

- [Installation](/docs/installation) — set up the toolchain.
- [Your First App](/docs/your-first-app) — scaffold and run an app.
- [Components & `render!`](/docs/components) — start building UI.
