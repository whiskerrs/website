---
title: Imperative & Refs
description: ElementRef, typed handles, measurement, and animation.
order: 9
---

# API Reference: Imperative & Refs

Most of Whisker is declarative — you describe the view and the reactive
runtime drives it. A few operations need an **imperative** handle to a
mounted element: measuring its layout box, taking a screenshot, scrolling
a `<scroll-view>`, or running a keyframe animation. Whisker exposes these
through a `ref:` prop and a small family of typed handles.

```rust
use whisker::prelude::*;
```

## The `ref:` pattern

1. Allocate a handle (or a bare [`ElementRef`](#elementref)) in your
   component body.
2. Attach it with the `ref:` prop in `render!` — the macro routes `ref:`
   to the underlying [`bind_ref`](#elementref) builder method, which binds
   the ref when the element mounts.
3. After mount, call the handle's imperative methods — typically from
   [`on_mount`](/docs/reactivity-api) or an [`effect`](/docs/reactivity-api)
   that observes the ref's `bound()` signal.

```rust
#[component]
fn card() -> Element {
    let card = ElementHandle::new();

    effect({
        let card = card;
        move || {
            if card.r().bound().get() {
                spawn_local(async move {
                    if let Ok(rect) = card.bounding_client_rect().await {
                        println!("card is {}x{}", rect.width, rect.height);
                    }
                });
            }
        }
    });

    render! {
        view(ref: card.r()) {
            text(value: "measure me")
        }
    }
}
```

> Result-returning methods (measurement, screenshots) run over the
> **async** invoke path — the platform reply arrives on the UI thread
> via a callback. Fire-and-forget actions (scroll, accessibility focus)
> are synchronous. See [Tasks & Threading](/docs/tasks) for `spawn_local`.

## `ElementRef`

The non-generic, framework-internal handle every typed handle wraps. It
holds a reactive `Option<Element>` binding (so `bound()` is observable)
and exposes the raw invoke surface. App code usually holds a typed handle
instead; reach for `ElementRef` directly only when bridging a custom
native component. `Copy`.

| Method | Signature | Notes |
|---|---|---|
| `new` | `ElementRef::new() -> Self` | Allocate a fresh, unbound ref. |
| `element` | `&self -> Option<Element>` | Currently-bound element, or `None`. Non-reactive. |
| `is_bound` | `&self -> bool` | `true` iff bound right now. Non-reactive. |
| `bound` | `&self -> Signal<bool>` | Reactive mount/unmount observation; subscribe inside `effect` / `computed`. |
| `invoke` | `&self, method: &str, args: WhiskerValue -> WhiskerValue` | Fire-and-forget. Returns `Null` (or `Error` when unbound); the platform result isn't available synchronously. |
| `invoke_async` | `async &self, method: &str, args: WhiskerValue -> WhiskerValue` | Result-returning; `WhiskerValue::Error` on not-bound / dispatch failure. |
| `invoke_typed` | `async &self, method: &str, args: WhiskerValue -> Result<T, RefError>` | Deserializes the reply into `T`; the building block for handle result-methods. |

`args` is a single [`WhiskerValue`](/docs/platform-modules#whiskervalue)
passed straight through as the method's params object — built-in Lynx
methods read named fields ([`WhiskerValue::map`](/docs/platform-modules#whiskervalue)),
Whisker module elements read [`WhiskerValue::args`](/docs/platform-modules#whiskervalue).

> `bind` / `clear` exist but are framework-internal (emitted by the macro
> layer on mount/unmount). Don't call them from app code.

## Typed handles

A handle exposes only the methods its element supports, so you can't call
`scroll_to` on a `<text>`. All handles are `Copy`, share the generic
methods below, and bind via `ref: handle.r()`.

### Generic methods (on every handle)

| Method | Signature | Lynx method |
|---|---|---|
| `bounding_client_rect` | `async &self -> Result<BoundingClientRect, RefError>` | `boundingClientRect` |
| `take_screenshot` | `async &self -> Result<String, RefError>` | `takeScreenshot` (base64) |
| `request_ui_info` | `async &self -> Result<UiInfo, RefError>` | `requestUIInfo` |
| `request_accessibility_focus` | `&self` | `requestAccessibilityFocus` (fire-and-forget) |

### `ElementHandle`

Any element. Adds nothing beyond the generic methods above.

| Method | Signature |
|---|---|
| `new` | `ElementHandle::new() -> Self` |
| `r` | `&self -> ElementRef` |

### `ScrollViewHandle`

A mounted `<scroll-view>`. Bind via `scroll_view(ref: handle.r())`.

| Method | Signature | Notes |
|---|---|---|
| `new` | `ScrollViewHandle::new() -> Self` | |
| `r` | `&self -> ElementRef` | |
| `get_scroll_info` | `async &self -> Result<ScrollInfo, RefError>` | Current offset + scrollable range. |
| `scroll_to` | `&self, offset: f64, smooth: bool` | Absolute offset (logical px). |
| `scroll_to_index` | `&self, index: i32, smooth: bool` | Align child `index` to scroll start. |
| `scroll_by` | `&self, offset: f64` | Relative; always instant. |
| `auto_scroll` | `&self, rate: f64` | Start auto-scrolling at `rate` px/s. |
| `stop_auto_scroll` | `&self` | Halt an in-progress auto-scroll. |

### `TextHandle`

A mounted `<text>`. Bind via `text(ref: handle.r())`.

| Method | Signature | Notes |
|---|---|---|
| `new` | `TextHandle::new() -> Self` | |
| `r` | `&self -> ElementRef` | |
| `get_selected_text` | `async &self -> Result<String, RefError>` | Currently-selected substring. |
| `get_text_bounding_rect` | `async &self, start: i32, end: i32 -> Result<TextBoundingRect, RefError>` | Layout box(es) of `[start, end)`. |
| `set_text_selection` | `&self, start_x: f64, start_y: f64, end_x: f64, end_y: f64` | Highlight a region (logical px). |

> **Android note:** the `<text>` geometry methods need a real text
> layout. Set `flatten: false` on the `<text>` if you call them on
> Android; iOS extracts boxes regardless.

## Return & measurement types

All rects are in LynxView coordinates. Every field is `#[serde(default)]`,
so any key the platform omits reads back as `0.0` / empty rather than
failing the decode. Each is `#[non_exhaustive]`.

| Type | Fields |
|---|---|
| `BoundingClientRect` | `left`, `top`, `right`, `bottom`, `width`, `height` (all `f64`) |
| `ScrollInfo` | `scroll_x`, `scroll_y`, `scroll_range`, `scroll_width`, `scroll_height` (all `f64`) |
| `TextBoundingRect` | `bounding_rect: BoundingClientRect` (union box), `boxes: Vec<BoundingClientRect>` (per-line) |
| `UiInfo` | `id: String`, plus `left`/`top`/`right`/`bottom`/`width`/`height`/`scroll_left`/`scroll_top` (`f64`) |

### `RefError`

Returned by `invoke_typed` and the handle result-methods.
`#[non_exhaustive]`.

| Variant | Meaning |
|---|---|
| `NotBound` | The ref isn't bound to a mounted element (not yet rendered, or unmounted). |
| `DispatchFailed { method, message }` | Platform-side dispatch error (unknown method, type mismatch, exception); `message` is the bridge's verbatim description. |

Implements `Display` + `std::error::Error`, so it `?`-propagates through
`Result` chains.

## Animation

Drive a Lynx element animation imperatively. The handles above bind the
element; pass `handle.r().element().unwrap()` (or the `Element` you hold)
to these free functions.

### `AnimateOptions`

Timing options for `animate_start`. The struct is `#[non_exhaustive]`, so
construct it with `AnimateOptions::new()` (defaults: 300ms linear forwards,
plays once) and the chained setters — **not** a struct literal.

| Setter | Signature | Default |
|---|---|---|
| `duration_ms` | `u32` | `300` |
| `easing` | `impl Into<String>` | `"linear"` |
| `iterations` | `f64` (use `f64::INFINITY` for infinite) | `1.0` |
| `direction` | `impl Into<String>` (`"normal"`/`"reverse"`/`"alternate"`/`"alternate-reverse"`) | `"normal"` |
| `fill` | `impl Into<String>` (`"none"`/`"forwards"`/`"backwards"`/`"both"`) | `"forwards"` |
| `delay_ms` | `u32` | `0` |

### `AnimateOp`

The Lynx animation lifecycle operations. `#[repr(i32)]`.

| Variant | Value | Meaning |
|---|---|---|
| `Start` | `0` | Start (or restart) with keyframes + options. |
| `Play` | `1` | Resume a paused animation. |
| `Pause` | `2` | Pause in place. |
| `Cancel` | `3` | Cancel — clear styles, drop the animation. |
| `Finish` | `4` | Snap to the end state and stop. |

### Functions

| Function | Signature |
|---|---|
| `animate_start` | `(handle: Element, animation_name: &str, keyframes: &[(&str, &[(&str, &str)])], options: &AnimateOptions) -> Result<(), String>` |
| `animate_cancel` | `(handle: Element, animation_name: &str) -> Result<(), String>` |
| `invoke_element_animate` | `(handle: Element, operation: i32, animation_name: &str, keyframes: WhiskerValue, options: WhiskerValue) -> WhiskerValue` |

`animate_start` / `animate_cancel` are the high-level wrappers;
`invoke_element_animate` is the lower-level dispatch (pass an `AnimateOp`
discriminant as `operation`, and `WhiskerValue::Null` for keyframes /
options on non-`Start` operations).

`keyframes` is a slice of `(offset, css_props)` — `offset` is a percent
string (`"0%"` / `"50%"` / `"100%"`), `css_props` the property → value map
applied at that frame.

```rust
use whisker::prelude::*;

#[component]
fn fade() -> Element {
    let card = ElementHandle::new();

    on_mount({
        let card = card;
        move || {
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
        }
    });

    render! {
        view(ref: card.r()) {
            text(value: "fading in")
        }
    }
}
```

See also: [Elements](/docs/elements) for the tags you bind, and
[Platform Modules](/docs/platform-modules) for the `WhiskerValue`
argument model these methods share.
