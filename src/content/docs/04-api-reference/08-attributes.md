---
title: Attributes
description: Typed attribute enums for built-in element props.
order: 8
---

# API Reference: Attributes

Several built-in [element](/docs/elements) props whose Lynx-side
contract is a closed set of strings take a **typed enum** rather than a
raw string. A typo like `"verticle"` used to parse fine on the Rust
side and be silently ignored by Lynx; the typed enums turn those into
compile errors instead.

Each enum is `#[non_exhaustive]` (so a future Lynx-side keyword can be
added without breaking downstream `match` arms) and implements `as_str`
(a `const fn` returning the canonical wire string) and `Display` (which
emits that same string at the bridge boundary). Reactivity works as
usual: anything implementing `Into<Signal<EnumType>>` is accepted, so a
`RwSignal<ScrollOrientation>` flips the attribute live.

> **These are element-attribute enums, distinct from the CSS keyword
> enums** (`Display`, `FlexDirection`, `JustifyContent`, …) documented
> on the [CSS](/docs/css) page. CSS enums go inside `style` / `css!`;
> the enums here are passed to element props.

All are re-exported from the prelude.

## `ScrollOrientation`

Direction in which a [`scroll_view`](/docs/elements#scroll_view)
scrolls. Maps to Lynx's `scroll-orientation`.

| Variant | Wire string |
|---|---|
| `Vertical` | `"vertical"` (default) |
| `Horizontal` | `"horizontal"` |

## `ListType`

Layout mode for a [`list`](/docs/elements#list). Maps to Lynx's
`list-type`.

| Variant | Wire string |
|---|---|
| `Single` | `"single"` — single-column linear list (default) |
| `Flow` | `"flow"` — grid-style flow layout |
| `Waterfall` | `"waterfall"` — staggered / Pinterest-style |

## `PanInterceptDirection`

Direction along which an element intercepts swipe gestures. Maps to
Lynx's `pan-intercept-direction`. Pair with `PanInterceptScope` to
choose which elements in the hit-test chain it applies to.

| Variant | Wire string |
|---|---|
| `Horizontal` | `"horizontal"` |
| `Vertical` | `"vertical"` |
| `None` | `"none"` — disable the intercept (default) |

## `PanInterceptScope`

Scope of `PanInterceptDirection` — which elements in the hit-test chain
participate. Maps to Lynx's `pan-intercept-scope`. (`SelfElement` reads
`"self"`; the rename dodges Rust's `Self` keyword.)

| Variant | Wire string |
|---|---|
| `SelfElement` | `"self"` |
| `Ancestors` | `"ancestors"` |
| `Descendants` | `"descendants"` |
| `SelfAndAncestors` | `"self-and-ancestors"` |
| `SelfAndDescendants` | `"self-and-descendants"` |
| `All` | `"all"` |
| `None` | `"none"` |

## `TextVerticalAlign`

Vertical alignment for a single-line [`text`](/docs/elements#text)
element. Maps to Lynx's `text-single-line-vertical-align`.

| Variant | Wire string |
|---|---|
| `Normal` | `"normal"` — platform default (baseline-aligned) |
| `Top` | `"top"` |
| `Center` | `"center"` |
| `Bottom` | `"bottom"` |

## `AccessibilityTrait`

Accessibility role advertised to platform a11y services (VoiceOver on
iOS, TalkBack on Android). Maps to Lynx's `accessibility-trait`.

| Variant | Wire string |
|---|---|
| `Button` | `"button"` — a tap target |
| `Image` | `"image"` — picture / icon, no inherent action |
| `Text` | `"text"` — block of static text |
| `None` | `"none"` — platform default |

## Usage

```rust
use whisker::prelude::*;

render! {
    scroll_view(
        scroll_orientation: ScrollOrientation::Horizontal,
        style: "flex: 1;",
    ) {
        view(
            accessibility_trait: AccessibilityTrait::Button,
            pan_intercept_direction: PanInterceptDirection::Horizontal,
            pan_intercept_scope: PanInterceptScope::SelfAndAncestors,
        ) {
            text(
                text_single_line_vertical_align: TextVerticalAlign::Center,
                value: "next",
            )
        }
    }
}
```

Reactive variant — flip the enum through a signal:

```rust
let orientation = signal(ScrollOrientation::Vertical);

render! {
    scroll_view(scroll_orientation: orientation) {
        // ... content ...
    }
}
```

See [Elements](/docs/elements) for the props that take these enums.
