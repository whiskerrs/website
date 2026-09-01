---
title: Attributes
description: Typed non-CSS options and common element metadata.
order: 8
---

# API Reference: Attributes

Whisker does not accept an open-ended string attribute map. Built-in and
module elements expose typed builder methods, while visual styling belongs in
[`Css`](/docs/css).

## Common element attributes

Every built-in and module element implements `ElementBuilder` and therefore
accepts:

| Method          | Type                               | Purpose                                    |
| --------------- | ---------------------------------- | ------------------------------------------ |
| `style`         | `impl Into<Style>`                 | Structured, optionally reactive CSS        |
| `id`            | `impl Into<Signal<String>>`        | Stable identifier exposed on event targets |
| `dataset`       | `impl Into<Signal<Dataset>>`       | Structured application metadata            |
| `accessibility` | `impl Into<Signal<Accessibility>>` | Cross-platform semantics                   |
| `element_ref`   | `ElementRef`                       | Bind an imperative handle                  |

`Dataset` stores `WhiskerValue`, so booleans and numbers keep their types on
every Host:

```rust
View(
    id: "save-button",
    dataset: Dataset::new()
        .string("screen", "settings")
        .bool("dirty", true),
    accessibility: Accessibility::new()
        .role(AccessibilityRole::Button)
        .label("Save settings"),
) {
    Text(value: "Save")
}
```

The values are available through `event.target` and
`event.current_target`.

## Scroll options

`ScrollView` owns the non-CSS scrolling controls:

- `axis: ScrollAxis`
- `scroll_enabled: bool` or a signal
- `snap: ScrollSnap`
- `scroll_snap_stop: ScrollSnapStop`
- `on_scroll: Fn(ScrollEvent)`

`ScrollSnap::start()`, `center()`, and `end()` align an item to the
corresponding viewport edge. `with_offset(px)` applies a logical-pixel
displacement. `ScrollSnapStop::Always` limits one gesture to one snap point;
`Normal` permits momentum to pass intermediate points.

```rust
ScrollView(
    axis: ScrollAxis::Horizontal,
    snap: ScrollSnap::center(),
    scroll_snap_stop: ScrollSnapStop::Always,
) {
    // pages
}
```

Layout and paint properties are not duplicated as attributes. Put them in a
structured `css!(...)` value so Taffy and every Host receive the same contract.
