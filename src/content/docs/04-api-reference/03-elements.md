---
title: Elements
description: Built-in element builders and their common and element-specific methods.
order: 3
---

# API Reference: Elements

Elements are retained scene nodes represented in application code by a small,
runtime-local `Element` handle. Built-ins expose PascalCase builders and use the
same common builder contract as Host module elements.

```rust
render! {
    View(style: css!(padding: px(16))) {
        Text(value: "Hello")
    }
}
```

This is shorthand for calls ending in `.build()`. Application code normally
imports all built-ins through `whisker::prelude::*`.

## Built-ins

### `View`

The general rectangular container and interaction target. It accepts ordinary
element children and is the default choice for grouping, flex/grid layout,
backgrounds, borders, clipping, and pointer handlers.

```rust
View::builder()
    .style(css!(padding: px(16)))
    .on_tap(|event| println!("{:?}", event.detail))
    .body(|body| body.push(Text::builder().value("Open").build()))
    .build()
```

### `Text`

A measured plain-text leaf. `value` accepts `Into<Signal<String>>`, so a string,
`ReadSignal<String>`, `RwSignal<String>`, or computed signal can drive it.
Typography and color are structured style properties.

| Method      | Value                  | Notes                        |
| ----------- | ---------------------- | ---------------------------- |
| `value`     | `Into<Signal<String>>` | Required text content        |
| `max_lines` | `Into<Signal<u32>>`    | `0` restores unlimited lines |

Raw text nodes are runtime implementation details and are not public element
tags.

### `ScrollView`

A fully mounted scrollable container. Use it for bounded content, carousels, and
pagers; use `List` for large data sets that need Rust-owned virtualization.

| Method             | Value                      | Notes                                                |
| ------------------ | -------------------------- | ---------------------------------------------------- |
| `axis`             | `ScrollAxis` or signal     | Vertical by default                                  |
| `snap`             | `ScrollSnap` or signal     | Start, center, end, or custom item anchor            |
| `scroll_snap_stop` | `ScrollSnapStop` or signal | `Always` advances at most one snap point per gesture |
| `scroll_enabled`   | `bool` or signal           | Disables user scrolling, not imperative commands     |
| `on_scroll`        | `Fn(ScrollEvent)`          | Current offset, content size, delta, and drag state  |

```rust
render! {
    ScrollView(
        axis: ScrollAxis::Horizontal,
        snap: ScrollSnap::start(),
        scroll_snap_stop: ScrollSnapStop::Always,
    ) {
        /* pages */
    }
}
```

### `List`

A Rust control primitive that virtualizes ordinary element subtrees inside a
standard `ScrollView`. It is not a special Host view and does not accept a body;
`each`, `key`, and `children` are required type-stated render props.

```rust
render! {
    List(
        style: css!(flex_grow: 1.0),
        content_style: css!(row_gap: px(8)),
        each: move || rows.get(),
        key: |row: &Row| row.id,
        children: |row: ReadSignal<Row>| render! { RowView(row: row) },
    )
}
```

`style` applies to the scroll viewport; `content_style` applies to the inner
layout track. Additional methods include `axis`, `scroll_enabled`,
`start_reached_threshold`, `end_reached_threshold`, `on_start_reached`,
`on_end_reached`, `header`, `footer`, `empty`, `on_scroll`, `list_ref`, and
`initial_scroll`.

Items need no estimated or fixed-size API. The virtualizer learns measured
geometry and preserves stable-key state while a key remains mounted. Items that
leave the window dispose their owner; when mounted again they start with fresh
local state. See [Lists & Conditionals](/docs/lists-and-conditionals).

### `Fragment`

A transparent grouping node. It exists in the Rust mirror but is not forwarded
as a Host view, so it has no style, accessibility, attributes, or event methods.
Its children are hoisted to the nearest real ancestor in source order.

## Common `ElementBuilder` methods

`View`, `Text`, `ScrollView`, `List`, and `#[module_element]` builders share the
following surface unless a control primitive intentionally restricts it.

### Presentation and semantics

| Method          | Purpose                                                   |
| --------------- | --------------------------------------------------------- |
| `style`         | Structured `Css`, `ReadSignal<Css>`, or `RwSignal<Css>`   |
| `id`            | Stable identifier surfaced in event target metadata       |
| `dataset`       | Structured application metadata surfaced on event targets |
| `accessibility` | Role, label/value/hint, state, and related semantics      |
| `element_ref`   | Bind an `ElementRef` for mounted commands                 |
| `child`         | Append one already-built child in direct builder code     |

`hit_slop`, class names, raw attributes, and raw CSS escape hatches are not part
of the public contract.

### Pointer and touch events

Each common event has bubble and capture variants. A `*_catch` listener stops
propagation at that point.

- `on_tap`, `on_tap_catch`, `on_capture_tap`,
  `on_capture_tap_catch`
- the same four forms for `click`, `touchstart`, `touchmove`, `touchend`, and
  `touchcancel`

Handlers receive a typed `TouchEvent`. Hit testing and propagation happen in
the retained Rust scene, giving every Host the same phase and stop semantics.

### Animation lifecycle

- `on_animationstart`
- `on_animationend`
- `on_animationcancel`
- `on_animationiteration`
- `on_transitionstart`
- `on_transitionend`
- `on_transitioncancel`

These handlers receive `AnimationEvent`; the timeline and lifecycle generation
are shared Rust behavior rather than Host animation callbacks.

## Host module elements

`#[whisker::module_element]` creates another element builder with the common
surface above plus its declared properties and `on_<event>` setters. Its schema
also declares whether it accepts element or text children, whether intrinsic
measurement is needed, whether resolved text style is delivered, and which
imperative commands the mounted `ElementRef` may invoke.

Built-ins and external module elements are equal at the runtime boundary: both
resolve a registered element identity and produce the same scene/frame
operations. The Host implementation decides which native object, DOM node, or
Desktop renderer object represents that identity.

## Refs and commands

Bind with `element_ref`, not a special `ref` keyword:

```rust
let card = ElementRef::new();

render! {
    View(element_ref: card) {
        Text(value: "Measured later")
    }
}
```

Built-in typed wrappers such as `ScrollViewHandle`, `TextHandle`, and
`ListHandle` provide their supported commands. Module-specific wrappers should
hide string command names from application code. See [Refs](/docs/refs).
