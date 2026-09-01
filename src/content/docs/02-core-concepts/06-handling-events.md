---
title: Handling Events
description: Respond to pointer, scroll, animation, and module events.
order: 6
---

# Handling Events

Event handlers are builder arguments. They run on the `RuntimeInstance` while
the Host is driving an input transaction, so they can update signals directly:

```rust
use whisker::prelude::*;

#[whisker::component]
fn Counter() -> Element {
    let count = signal(0);

    render! {
        View(on_tap: move |_| count.update(|value| *value += 1)) {
            Text(value: computed(move || format!("Count: {}", count.get())))
        }
    }
}
```

## Pointer handlers

`View`, `Text`, `ScrollView`, and module elements share the `ElementBuilder`
pointer methods:

- `on_tap`, `on_click`
- `on_touchstart`, `on_touchmove`, `on_touchend`, `on_touchcancel`
- the corresponding `_catch`, `on_capture_*`, and
  `on_capture_*_catch` variants

The normal handler participates in the bubble phase. Capture handlers run from
the root toward the target. A `catch` handler stops propagation at that
listener. Hit testing and propagation happen in Whisker's retained scene, so
the semantics do not change between Hosts.

```rust
View(on_capture_tap: |_| println!("outer capture")) {
    View(on_tap_catch: |event| {
        println!("tap at {}, {}", event.detail.x, event.detail.y);
    }) {
        Text(value: "Tap")
    }
}
```

## Event metadata

`TouchEvent` includes surface coordinates, pointer identity/type, buttons,
active touches, and both `target` and `current_target`. An element's `id` and
structured `Dataset` are included in those targets.

```rust
View(
    id: "album",
    dataset: Dataset::new().int("album_id", 42),
    on_tap: |event| {
        if let Some(value) = event.target.dataset.get("album_id") {
            println!("album: {value:?}");
        }
    },
)
```

## Scroll and animation events

`ScrollView` and `List` expose `on_scroll: Fn(ScrollEvent)`. Its detail contains
the current offset, content and viewport sizes, deltas, and drag state.

CSS transitions and keyframe animations expose lifecycle handlers such as
`on_animationstart`, `on_animationend`, `on_animationcancel`,
`on_transitionstart`, and `on_transitionend`.

## Module events

A `#[whisker::module_element]` event prop is deserialized from
`WhiskerValue` into the Rust event type declared in the function signature.
Function-shaped modules use `PlatformModule::on_event`; keep the returned
subscription alive for as long as events are needed.

See the [event type reference](/docs/events) for exact payload fields.
