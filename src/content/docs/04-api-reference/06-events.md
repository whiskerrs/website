---
title: Events
description: The typed event objects passed to on_<event> handlers.
order: 6
---

# API Reference: Events

When you attach an `on_<event>` handler to a built-in tag, the handler
receives a **typed event object** describing what happened. These types
live in the `whisker::event` module:

```rust
use whisker::prelude::*;
use whisker::event::TouchEvent;

render! {
    view(on_tap: move |e: TouchEvent| {
        let p = e.detail; // first touch point, LynxView coordinates
        println!("tapped at {}, {}", p.x, p.y);
    }) {
        text(value: "tap me")
    }
}
```

The event body crosses the bridge as a
[`WhiskerValue`](/docs/platform-modules#whiskervalue) and is
deserialized into the struct for you. The handler signature is
`Fn(E) + 'static` — write it as `move |e| …`. If you only care *that*
the event fired, a `move |_| …` closure also works.

> **The handler always fires.** "The event happened" is the primary
> signal; the typed payload is supplementary. Every field uses
> `#[serde(default)]`, so a missing or unrecognized key degrades to a
> zero value rather than dropping the call. A bodyless event (some
> Android touch payloads are empty) still invokes the handler with a
> default-valued struct.

All event structs are `#[non_exhaustive]` — match and construct them by
field, not positionally.

## `Event` (base)

The fields present on every event. The richer event types below repeat
these same four fields and add their own.

| Field | Type | Description |
|---|---|---|
| `kind` | `String` | Event name (`"tap"`, `"touchstart"`, …); the body's `type` key. |
| `timestamp` | `f64` | Milliseconds since the event was generated. |
| `target` | [`Target`](#target) | The element the event originated on. |
| `current_target` | [`Target`](#target) | The element whose listener is firing. |

## `TouchEvent`

Delivered to `on_tap`, `on_longpress`, `on_click`, and the
`on_touchstart` / `on_touchmove` / `on_touchend` / `on_touchcancel`
handlers.

| Field | Type | Description |
|---|---|---|
| *(base fields)* | | `kind`, `timestamp`, `target`, `current_target`. |
| `detail` | [`Point`](#point) | Position of the first touch point (LynxView coordinates). |
| `touches` | `Vec<`[`Touch`](#touch)`>` | All touch points currently on the surface. |
| `changed_touches` | `Vec<`[`Touch`](#touch)`>` | Touch points whose state changed in this event. |

## `AnimationEvent`

Delivered to the `on_animation*` (`animationstart` / `animationiteration`
/ `animationend` / `animationcancel`) and `on_transition*`
(`transitionend`) handlers.

| Field | Type | Description |
|---|---|---|
| *(base fields)* | | `kind`, `timestamp`, `target`, `current_target`. |
| `animation_type` | `String` | `"keyframe-animation"` or `"transition-animation"`. |
| `animation_name` | `String` | The `@keyframes` name, or the transitioned CSS property. |
| `new_animator` | `bool` | Whether a new animator drove this event. |

## `CustomEvent`

Delivered to lifecycle events such as `on_uiappear`, `on_uidisappear`,
and other component state-change events whose payload shape is
component-specific.

| Field | Type | Description |
|---|---|---|
| *(base fields)* | | `kind`, `timestamp`, `target`, `current_target`. |
| `detail` | [`WhiskerValue`](/docs/platform-modules#whiskervalue) | Opaque component-supplied state; `WhiskerValue::Null` when absent. The handler inspects it itself. |

## `ScrollEvent`

Delivered to the `<scroll_view>` scroll events (`scroll`,
`scrolltoupper`, `scrolltolower`, `scrollend`, `contentsizechanged`).
These are target-only (no catch/capture variants).

| Field | Type | Description |
|---|---|---|
| *(base fields)* | | `kind`, `timestamp`, `target`, `current_target`. |
| `detail` | [`ScrollDetail`](#scrolldetail) | Current scroll geometry. |

### `ScrollDetail`

| Field | Type | Description |
|---|---|---|
| `scroll_left` | `f64` | Horizontal content offset (px). |
| `scroll_top` | `f64` | Vertical content offset (px). |
| `scroll_width` | `f64` | Total scrollable content width (px). |
| `scroll_height` | `f64` | Total scrollable content height (px). |
| `delta_x` | `f64` | Horizontal delta since the previous scroll event (px). |
| `delta_y` | `f64` | Vertical delta since the previous scroll event (px). |
| `is_dragging` | `bool` | Whether the user's finger is currently dragging. |

## Text events

Delivered to the `<text>` handlers — see [Elements](/docs/elements).

### `TextLayoutEvent`

Fired after text layout completes (`layout`).

| Field | Type | Description |
|---|---|---|
| *(base fields)* | | `kind`, `timestamp`, `target`, `current_target`. |
| `detail` | [`TextLayoutDetail`](#textlayoutdetail) | Layout result. |

#### `TextLayoutDetail`

| Field | Type | Description |
|---|---|---|
| `line_count` | `i64` | Number of laid-out lines. |
| `lines` | `Vec<`[`TextLineInfo`](#textlineinfo)`>` | Per-line ranges and ellipsis info. |
| `size` | [`Size`](#supporting-types) | Laid-out content size. |

#### `TextLineInfo`

| Field | Type | Description |
|---|---|---|
| `start` | `i64` | Character index of the line's first glyph. |
| `end` | `i64` | Character index just past the line's last glyph. |
| `ellipsis_count` | `i64` | Characters replaced by the truncation ellipsis (0 if not truncated). |

### `SelectionChangeEvent`

Fired when the selected text range changes (`selectionchange`).

| Field | Type | Description |
|---|---|---|
| *(base fields)* | | `kind`, `timestamp`, `target`, `current_target`. |
| `detail` | [`SelectionDetail`](#selectiondetail) | The new selection range. |

#### `SelectionDetail`

| Field | Type | Description |
|---|---|---|
| `start` | `i64` | Start character index, or `-1` when there's no selection. |
| `end` | `i64` | End character index, or `-1` when there's no selection. |
| `direction` | `String` | `"forward"` or `"backward"`. |

## Supporting types

### `Target`

The element an event targets or is listening on.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | The element's `id` attribute (empty when unset). |
| `uid` | `i64` | Lynx Engine's unique element identifier (its "sign"). |
| `dataset` | `BTreeMap<String, `[`WhiskerValue`](/docs/platform-modules#whiskervalue)`>` | `data-*` attributes, keyed without the `data-` prefix. |

### `Point`

| Field | Type | Description |
|---|---|---|
| `x` | `f64` | Horizontal position. |
| `y` | `f64` | Vertical position. |

### `Touch`

One active touch point.

| Field | Type | Description |
|---|---|---|
| `identifier` | `i64` | Stable id for one finger's touch sequence. |
| `x` / `y` | `f64` | Position in the touched element's coordinate space. |
| `page_x` / `page_y` | `f64` | Position in LynxView coordinates. |
| `client_x` / `client_y` | `f64` | Position in window coordinates. |

### `Size`

| Field | Type | Description |
|---|---|---|
| `width` | `f64` | Width (px). |
| `height` | `f64` | Height (px). |

## Event propagation: the four-variant handler pattern

Each touch event exposes **four** handler variants on the built-in
builders, mapping to Lynx's bind/catch and capture/bubble matrix. Using
`tap` as the example (the same shape applies to `longpress`, `click`,
and the `touch*` events):

| Handler | Phase | Stops propagation? |
|---|---|---|
| `on_tap` | bubble | no |
| `on_tap_catch` | bubble | yes |
| `on_capture_tap` | capture | no |
| `on_capture_tap_catch` | capture | yes |

These correspond to the `BindType` enum that crosses the FFI:

| `BindType` | Variant | Meaning |
|---|---|---|
| `Bind` | `on_<event>` | Bubble phase, does not stop propagation (the default). |
| `Catch` | `on_<event>_catch` | Bubble phase, stops propagation at this element. |
| `CaptureBind` | `on_capture_<event>` | Capture phase, does not stop propagation. |
| `CaptureCatch` | `on_capture_<event>_catch` | Capture phase, stops propagation. |

An event travels **down** the tree (capture phase, root → target), then
back **up** (bubble phase, target → root). Capture handlers fire on the
way down; bubble handlers fire on the way up. A `catch` variant stops
the event at that element for the remainder of its phase. Plain
`on_<event>` is the common case.

The full list of per-element handlers — which events each tag supports —
is documented in [Elements](/docs/elements).
