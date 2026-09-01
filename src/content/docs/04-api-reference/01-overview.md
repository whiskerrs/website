---
title: Overview & Prelude
description: How Whisker's public Rust API is organized.
order: 1
---

# API Reference: Overview & Prelude

The `whisker` crate is the application-facing umbrella over the runtime, CSS,
animation, configuration, and macro crates. Most application files begin with:

```rust
use whisker::prelude::*;
```

## Main API groups

| Group                 | Important symbols                                                             | Reference                          |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| Entry and composition | `#[main]`, `#[component]`, `render!`, `compose!`                              | [Macros](/docs/macros)             |
| Elements              | `Element`, `View`, `Text`, `ScrollView`, `List`, `Fragment`, `ElementBuilder` | [Elements](/docs/elements)         |
| Styling               | `Css`, `css!`, typed property values and units                                | [CSS](/docs/css)                   |
| Reactivity            | `signal`, `computed`, `effect`, `resource`, signal and owner types            | [Reactivity](/docs/reactivity-api) |
| Control flow          | `Show`, `ForEach`                                                             | [Control Flow](/docs/control-flow) |
| Events                | `TouchEvent`, `ScrollEvent`, `AnimationEvent`, `Dataset`                      | [Events](/docs/events)             |
| Accessibility         | `Accessibility`, `AccessibilityRole`, `AccessibilityState`                    | [Attributes](/docs/attributes)     |
| Imperative operations | `ElementHandle`, `ScrollViewHandle`, `ListHandle`                             | [Imperative Handles](/docs/refs)   |
| Async                 | `spawn_local`, `run_blocking`, `runtime_dispatcher`                           | [Tasks](/docs/tasks)               |
| Animation             | `AnimationController`, `Tween`, `AnimConfig`, `Curve`                         | [CSS](/docs/css)                   |

## Module APIs

`#[whisker::module_element]` declares the Rust schema and builder for a custom
Host element. `module!`, `PlatformModule`, and `WhiskerValue` provide the
low-level function/event bridge for Host services. See
[Platform Modules](/docs/platform-modules) and
[Authoring a Module](/docs/authoring-a-module).

## Builder-first design

The macros are syntax over public builders. These two forms have the same
meaning:

```rust
render! {
    View(style: css!(padding: px(16))) {
        Text(value: "Hello")
    }
}
```

```rust
View::builder()
    .style(Css::new().padding(px(16)))
    .body(|children| children.push(Text::builder().value("Hello").build()))
    .build()
```

This keeps rust-analyzer completion useful even when a team chooses not to use
macro syntax.

## Lower-level crates

Framework and Host authors may use specialized crates directly:

- `whisker-runtime` — retained tree, reactivity, task driving, modules;
- `whisker-engine` — layout, intrinsic measurement, frame production;
- `whisker-protocol` — Host-independent frame and event contracts;
- `whisker-driver` / `whisker-driver-sys` — mobile ABI;
- `whisker-css` and `whisker-style` — structured style API and values;
- `whisker-plugin` and `whisker-cng` — generated Host project model.

Application code should prefer the umbrella crate unless it is deliberately
implementing one of those framework boundaries.
