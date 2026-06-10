---
title: Introduction
description: What Whisker is and why it exists.
order: 1
---

# Introduction

Whisker is a Rust-first framework for building native Android and iOS apps. You
write the UI, state graph, business logic, and native calls in one systems
language — no scripting runtime required.

## Why Whisker

- **One language.** Rust is the application language, not a native escape hatch.
- **Ergonomic UI.** A `render!` macro that reads like UI, with Rust safety underneath.
- **Native output.** Lynx-powered rendering produces real native widgets.
- **Fast iteration.** Sub-second hot reload built for the Rust edit-debug loop.

## A first look

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    let count = RwSignal::new(0);

    render! {
        page(style: css!(display: flex, gap: 12.px())) {
            text(value: format!("Count: {}", count.get()))
            view(on_tap: move || count.update(|n| *n += 1)) {
                text(value: "+1")
            }
        }
    }
}
```

Continue to [Getting Started](/docs/getting-started) to set up your first project.
