---
title: Writing UI
description: The render! macro, signals, and styling.
order: 3
---

# Writing UI

Whisker views are declared with the `render!` macro. It feels like UI, while
Rust keeps props, state, and platform calls fully typed.

## Signals

State is held in signals. Reading a signal inside a view subscribes that view to
changes; updating the signal re-renders the exact attributes that depend on it.

```rust
let name = RwSignal::new(String::from("world"));
let greeting = computed(move || format!("Hello, {}!", name.get()));
```

## Styling

Styling uses the `css!` macro, backed by the Lynx layout engine — CSS grid,
flexbox, gradients, and more.

```rust
render! {
    page(style: css!(
        display: grid,
        grid_template_columns: "1fr 1fr",
        gap: 16.px(),
    )) {
        text(value: greeting)
    }
}
```

## Tables

GitHub-flavored Markdown is supported, including tables:

| Element  | Purpose                    |
| -------- | -------------------------- |
| `page`   | Root container             |
| `view`   | Generic layout / gestures  |
| `text`   | Text rendering             |
| `Image`  | Native image with modes    |
