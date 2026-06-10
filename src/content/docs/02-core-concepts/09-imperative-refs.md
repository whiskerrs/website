---
title: Imperative Refs
description: Reach into a mounted element to call methods.
order: 9
---

# Imperative Refs

Almost everything in Whisker is **declarative**: you describe the view and
the reactive runtime keeps it in sync. But a few things can only be done by
calling a method on the *real, mounted* element — scrolling a list to the
top, measuring an element's on-screen rectangle, or starting an animation.
For those, Whisker gives you an **imperative handle** to an element.

```rust
use whisker::prelude::*;
```

## The pattern

It's always the same three steps:

1. **Create a handle** in your component body — e.g.
   `ScrollViewHandle::new()`, `ElementHandle::new()`, or a bare
   `ElementRef::new()`.
2. **Attach it** with the `ref:` prop in `render!`. The macro binds the
   handle to the element the moment it mounts.
3. **Call methods after mount** — typically from
   [`on_mount`](/docs/reactivity-api), or from an event handler that fires
   after the element exists.

The handle starts out *unbound*: there's no element to talk to until the
view mounts. That's why you don't call methods straight from the component
body — you wait for `on_mount` (or a tap).

## Example: scroll to top

A `ScrollViewHandle` binds a `<scroll-view>` and exposes its scroll
methods. Here, tapping a button scrolls the list back to the top:

```rust
#[component]
fn Feed() -> Element {
    let list = ScrollViewHandle::new();

    let scroll_top = move |_| {
        // offset 0, animated. Fire-and-forget — no await needed.
        list.scroll_to(0.0, true);
    };

    render! {
        view(style: "flex-direction: column;") {
            view(on_tap: scroll_top) {
                text(value: "Back to top")
            }
            scroll_view(ref: list.r(), style: "flex: 1;") {
                For(each: move || items.get(), key: |i| i.id) {
                    |item| render! { text(value: item.label) }
                }
            }
        }
    }
}
```

`list.r()` hands the `ref:` prop the underlying `ElementRef`; `scroll_to`
takes an absolute offset in logical pixels and a `smooth` flag. Scroll
actions are fire-and-forget, so they're synchronous — no `await`.

## Measuring an element

Some methods return a value from the platform — a layout rect, a
screenshot. Those run over the **async** invoke path: the reply comes back
on the UI thread via a callback, so you `.await` them inside a
[`spawn_local`](/docs/tasks) task. Read the box with `bounding_client_rect`:

```rust
#[component]
fn Card() -> Element {
    let card = ElementHandle::new();

    on_mount(move || {
        spawn_local(async move {
            if let Ok(rect) = card.bounding_client_rect().await {
                println!("card is {}×{}", rect.width, rect.height);
            }
        });
    });

    render! {
        view(ref: card.r()) {
            text(value: "measure me")
        }
    }
}
```

`bounding_client_rect` is available on every handle and returns a
`BoundingClientRect` (`left`, `top`, `right`, `bottom`, `width`, `height`).

## Animating an element

For imperative keyframe animation, build an `AnimateOptions` and call
`animate_start` on the bound `Element` — usually from `on_mount`:

```rust
#[component]
fn FadeIn() -> Element {
    let card = ElementHandle::new();

    on_mount(move || {
        if let Some(el) = card.r().element() {
            let _ = animate_start(
                el,
                "fade-in",
                &[
                    ("0%",   &[("opacity", "0")]),
                    ("100%", &[("opacity", "1")]),
                ],
                &AnimateOptions::new().duration_ms(200).easing("ease-out"),
            );
        }
    });

    render! {
        view(ref: card.r()) {
            text(value: "fading in")
        }
    }
}
```

`AnimateOptions::new()` gives sensible defaults (300ms, linear, plays once,
fills forwards); chain setters to override. `card.r().element()` returns the
bound `Element`, or `None` if it hasn't mounted yet — which is why `on_mount`
is the right place to call it.

## Typed handles

Each handle exposes only the methods its element actually supports — you
can't call `scroll_to` on a `<text>`. The common ones:

- **`ElementHandle`** — any element; just the generic methods
  (`bounding_client_rect`, `take_screenshot`, …).
- **`ScrollViewHandle`** — a `<scroll-view>`; adds `scroll_to`,
  `scroll_to_index`, `scroll_by`, `auto_scroll`, and friends.
- **`TextHandle`** — a `<text>`; adds text-selection and geometry methods.

The full list of handles, every method, and the return types is in the
[Imperative & Refs reference](/docs/refs).

## First-party modules bring their own handles

Built-in modules expose their own typed handles tailored to the element
they wrap — for example a video module gives you play/pause/seek controls
rather than generic element methods. When you mount a module element, bind
*its* handle the same way (`ref: handle.r()`) and call its module-specific
methods. See [First-party Modules](/docs/modules-api).

## Where to go next

- [Imperative & Refs reference](/docs/refs) — the complete handle and
  method list, plus `BoundingClientRect`, `ScrollInfo`, and `RefError`.
- [Tasks & Threading](/docs/tasks) — `spawn_local`, which you need for the
  result-returning methods.
- [First-party Modules](/docs/modules-api) — modules that ship their own
  imperative handles.
