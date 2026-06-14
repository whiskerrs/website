---
title: Styling with CSS
description: Style views with the css! macro and typed CSS values.
order: 2
---

# Styling with CSS

Every element takes a `style:` attribute. Whisker hands the declarations to
the **Lynx layout engine**, which runs flexbox, grid, gradients, transforms,
and transitions — so the property set looks like CSS you already know.

A `style:` accepts three things:

- a typed **`css!(...)`** value,
- a **raw CSS string**, or
- a **reactive signal** of either (the styles re-apply when it changes).

```rust
use whisker::prelude::*;

render! {
    // typed
    view(style: css!(padding: 16.px(), background_color: Color::hex(0x1A1A2E))) {
        text(value: "Card")
    }
    // raw string — handy for one-offs
    view(style: "padding: 16px;") {
        text(value: "Quick")
    }
}
```

This is uniform across **built-in and module** components: `style:` on a
module component (`Input`, `WebView`, `Image`, …) takes a `css!(…)` / `Css`
value — or a reactive `Css` / `String` signal — directly, exactly like a
built-in element. There's no `.to_css_string()` to call by hand.

## The `css!` macro

`css!(name: value, …)` builds a type-checked declaration block at compile
time, with IDE completion on every property. Property names are
**snake_case** (mapping to CSS's kebab-case), and values are typed enums and
units rather than bare strings:

```rust
use whisker::prelude::*;

let style = css!(
    display: Display::Flex,
    flex_direction: FlexDirection::Column,
    align_items: AlignItems::Center,
    gap: 12.px(),
    padding: 16.px(),
    background_color: Color::hex(0x1A1A2E),
    border_radius: 10.px(),
);
```

### Units

Numbers get their unit from extension methods — `12.px()`, `50.percent()`,
`90.deg()`, `300.ms()`. `i32` widens to `f32` automatically, so `8.px()` and
`8.0.px()` are the same:

```rust
css!(
    width: 50.percent(),
    height: 200.px(),
    margin_top: 8.px(),
)
```

The full list of unit helpers (`rpx`, `rem`, `vh`, `vw`, …) is in the
[CSS reference](/docs/css#units--number-extensions).

### Typed enums vs. raw strings

Keyword values come from typed enums, so a value Lynx rejects fails to
compile instead of silently doing nothing. Lowercase keywords like
`flex` and `column` in `css!` resolve to those enum variants; you can also
name them explicitly when it reads clearer:

```rust
use whisker::css::{Display, FlexDirection};

css!(display: Display::Flex, flex_direction: FlexDirection::Column)
// equivalent to
css!(display: Display::Flex, flex_direction: FlexDirection::Column)
```

If you need a Lynx-only property the typed builder doesn't model, append it
raw — the chain stays typed everywhere else:

```rust
css!(font_size: 16.px(), color: Color::hex(0xFFFFFF))
    .raw("text-maxline", "2")
```

## Layout with flexbox

Lynx lays out with flexbox once you opt in with `display: flex`. **The one
thing to remember:** `flex-direction` defaults to **`row`**, so a container
of children you expect to stack vertically will instead squeeze across the
screen. Always declare `flex_direction: column` for a vertical stack:

```rust
render! {
    // vertical stack — note the explicit `column`
    view(style: css!(
        display: Display::Flex,
        flex_direction: FlexDirection::Column,
        gap: 8.px(),
    )) {
        text(value: "First")
        text(value: "Second")
    }
}
```

The usual flex properties are all here — `justify_content`, `align_items`,
`gap`, and per-item `flex_grow` / `flex_shrink` (which take plain numbers):

```rust
css!(
    display: Display::Flex,
    flex_direction: FlexDirection::Row,
    justify_content: JustifyContent::SpaceBetween,
    align_items: AlignItems::Center,
    flex_grow: 1.0,
)
```

## Reactive styles

Pass a signal to `style:` and the styles re-apply whenever it changes. The
common pattern is a [`computed`](/docs/reactivity-api) that derives a style
string from some state:

```rust
use whisker::prelude::*;

#[component]
fn toggle() -> Element {
    let on = RwSignal::new(false);

    let box_style = computed(move || {
        css!(
            width: 80.px(),
            height: 80.px(),
            border_radius: 8.px(),
            background_color: if on.get() {
                Color::hex(0x4F46E5)
            } else {
                Color::hex(0x334155)
            },
        )
        .to_css_string()
    });

    render! {
        view(style: box_style, on_tap: move |_| on.set(!on.get())) {
            text(value: "tap")
        }
    }
}
```

`computed` returns a `ReadSignal<String>` here; wiring it as `style:` makes
the view re-paint without the body touching the DOM. See
[State Management](/docs/state-management) and
[Reactivity](/docs/reactivity) for how this tracking works.

## Classes

`class:` attaches one or more CSS class names, the same as in HTML — useful
when a component library or page ships shared classes:

```rust
render! {
    view(class: "card elevated") {
        text(value: "Styled by a class")
    }
}
```

## Putting it together: a styled card

```rust
use whisker::prelude::*;

#[component]
fn profile_card(name: Signal<String>, role: Signal<String>) -> Element {
    render! {
        view(style: css!(
            display: Display::Flex,
            flex_direction: FlexDirection::Column,
            gap: 4.px(),
            padding: 16.px(),
            border_radius: 12.px(),
            background_color: Color::hex(0x1A1A2E),
        )) {
            text(style: css!(
                font_size: 18.px(),
                color: Color::hex(0xFFFFFF),
            ), value: name)
            text(style: css!(
                font_size: 14.px(),
                color: Color::hex(0x94A3B8),
            ), value: role)
        }
    }
}
```

Run it on a simulator with `whisker run ios`.

## What's next

- The complete enum, unit, color, and shorthand list lives in the
  [CSS reference](/docs/css).
- Make styles react to state in [State Management](/docs/state-management).
- Render lists and conditions in [Lists & Conditionals](/docs/lists-and-conditionals).
