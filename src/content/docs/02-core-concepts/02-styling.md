---
title: Styling
description: Structured CSS authoring, Taffy layout, paint, and reactive styles.
order: 2
---

# Styling

Every visual element accepts one structured `style` value. Whisker does not
parse CSS strings at runtime: property names and values are Rust methods and
types, so unsupported combinations fail during compilation.

```rust
use whisker::css::{AlignItems, Color, Display, FlexDirection};
use whisker::prelude::*;

render! {
    View(style: css!(
        display: Display::Flex,
        flex_direction: FlexDirection::Column,
        align_items: AlignItems::Center,
        gap: px(12),
        padding: px(16),
        border_radius: px(12),
        background_color: Color::hex(0x1A1A2E),
    )) {
        Text(value: "Card", style: css!(color: Color::hex(0xFFFFFF)))
    }
}
```

## `css!` and `Css`

`css!` is named-argument syntax over the public `Css` builder. These forms are
equivalent:

```rust
let a = css!(padding: px(16), opacity: 0.8);

let b = Css::builder()
    .padding(px(16))
    .opacity(0.8);
```

Use the macro for declarations embedded in UI and the builder when ordinary
Rust composition, generics, or conditional method calls are clearer. `Css`
values are owned, cloneable declaration sets and can be returned from helper
functions or merged before use.

Raw strings are intentionally rejected:

```text
View(style: "padding: 16px") // does not compile
```

## Values and units

Length helpers make units explicit:

```rust
px(16)
percent(100)
1.25.rem()
24.rpx()
90.deg()
250.ms()
```

Keyword values use enums such as `Display::Grid`,
`JustifyContent::SpaceBetween`, or `Overflow::Hidden`. Colors, gradients,
transforms, shadows, clip paths, transitions, and animations use structured
value or shorthand builders rather than encoded strings.

## Layout

Whisker resolves structured declarations in Rust and sends computed layout
inputs to Taffy. The supported layout surface follows Taffy's capabilities:

- block, flexbox, and grid layout;
- absolute and relative positioning;
- intrinsic measurement for text and Host elements;
- percentages, min/max constraints, aspect ratio, gaps, and overflow clipping.

The Host receives final logical-pixel geometry. Browser or native layout is not
the source of truth, so the same tree uses the same layout model on every Host.

## Paint and platform coverage

The Rust frame protocol represents semantic paint such as backgrounds, borders,
rounded corners, shadows, transforms, opacity, clipping, text, and image
resources. Each Host implements those operations with its platform renderer.
Properties outside layout generally follow Whisker's supported Lynx-compatible
subset, excluding removed vendor-only features. The
[CSS Reference](/docs/css) lists the actual typed surface; a method's presence
on `Css` is the compile-time contract.

## Reactive styles

Pass a `ReadSignal<Css>` or `RwSignal<Css>` directly to `style` to reapply it
when dependencies change:

```rust
let selected = signal(false);
let card_style = computed(move || {
    Css::builder()
        .padding(px(16))
        .background_color(if selected.get() {
            Color::hex(0x2563EB)
        } else {
            Color::hex(0x1F2937)
        })
});

render! {
    View(
        style: card_style,
        on_tap: move |_| selected.set(!selected.get()),
    ) {
        Text(value: "Select")
    }
}
```

Passing a computed style keeps the declaration reactive. Passing
`card_style.get()` takes a snapshot, just like other signal-backed props.

## Reuse and custom properties

Ordinary Rust functions and constants are the simplest reuse mechanism:

```rust
fn card_style() -> Css {
    css!(padding: px(16), border_radius: px(12))
}
```

Typed custom properties are also available when a value must inherit through
the element tree or participate in a reusable style fragment. They retain CSS
`var(--name, fallback)` semantics while values remain structured; Whisker does
not expose a selector cascade or stylesheet class system.

## What's next

- [CSS Reference](/docs/css)
- [Animations](/docs/css#animation)
- [Lists & Conditionals](/docs/lists-and-conditionals)
