---
title: Handling Events
description: Respond to taps, gestures, scrolls, and lifecycle.
order: 6
---

# Handling Events

UIs are interactive: a tap toggles something, a scroll loads more, a
view appears and you kick off work. In Whisker you wire all of this up by
attaching **handlers** as attributes on built-in elements, right inside
`render!`. A handler is just a closure — usually a `move ||` closure so
it owns the signals it touches.

```rust
use whisker::prelude::*;

render! {
    view(on_tap: move |_| println!("tapped")) {
        text(value: "Tap me")
    }
}
```

## Handlers are element attributes

Event handlers go in the parentheses alongside `style`, `class`, and the
rest. The attribute name is `on_` followed by the event: `on_tap`,
`on_longpress`, `on_touchstart` / `on_touchmove` / `on_touchend`, the
`<scroll_view>` scroll handlers, and lifecycle handlers like
`on_uiappear` / `on_uidisappear`. Which events a given tag supports is
listed per-element in the [Elements reference](/docs/elements).

```rust
render! {
    view(
        on_touchstart: move |_| println!("finger down"),
        on_touchend: move |_| println!("finger up"),
    ) {
        text(value: "Press and release")
    }
}
```

## The event argument

Every handler receives a **typed event** describing what happened. For
touch handlers that's a [`TouchEvent`](/docs/events). You get to choose
whether to look at it:

```rust
// Ignore the event — you only care that the tap happened.
view(on_tap: move |_| open_menu())

// Read the event — `e` is a TouchEvent.
view(on_tap: move |e| {
    let p = e.detail; // first touch point, in LynxView coordinates
    println!("tapped at {}, {}", p.x, p.y);
})
```

The handler signature is `Fn(E) + 'static`, so `move |e| …` binds the
event and `move |_| …` discards it. The payload is a convenience, not a
gate: the handler fires whenever the event fires, even when the body is
empty — see [Events](/docs/events) for the full list of event types and
their fields.

## The common pattern: a handler updates a signal

Most handlers exist to change state. Reach for a signal, mutate it in the
closure, and the parts of the view that read it update on their own:

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    let count = RwSignal::new(0);

    render! {
        view(on_tap: move |_| count.update(|n| *n += 1)) {
            text(value: count)
        }
    }
}
```

Because `RwSignal` is `Copy`, it moves cleanly into the closure. The
mechanics of signals and updates live in
[State Management](/docs/state-management) and the
[Reactivity reference](/docs/reactivity-api).

## Propagation: capture, bubble, and catch

A touch event travels **down** the tree to the element you touched (the
*capture* phase, root → target) and then back **up** (the *bubble* phase,
target → root). Plain `on_tap` listens during the bubble phase — that's
the common case, and usually all you need.

Each touch event actually exposes **four** handler variants:

| Handler | Phase | Stops propagation? |
|---|---|---|
| `on_tap` | bubble | no |
| `on_tap_catch` | bubble | yes |
| `on_capture_tap` | capture | no |
| `on_capture_tap_catch` | capture | yes |

The `_catch` variants stop the event at that element so ancestors don't
also receive it — use one when an inner control should fully consume the
tap and not trigger an outer handler:

```rust
render! {
    // Tapping the card navigates...
    view(on_tap: move |_| open_card()) {
        text(value: "Open")
        // ...but tapping the close button must NOT also open the card.
        view(on_tap_catch: move |_| dismiss()) {
            text(value: "✕")
        }
    }
}
```

The same four-variant shape applies to `longpress`, `click`, and the
`touch*` events. The full matrix is in the
[Events reference](/docs/events#event-propagation-the-four-variant-handler-pattern).

## Accessibility

Accessibility props sit on elements too, right alongside event handlers —
labels, roles, and traits go in the same parentheses. See
[Elements](/docs/elements) for the available a11y attributes.

## A note on text input

There is **no text-input element** yet, so there are no text-change
events to handle. When one lands, this page will grow to cover it.

## What's next

- Drive your handlers' updates through [State Management](/docs/state-management).
- Share values without threading them through props in [Context](/docs/context).
