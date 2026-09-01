---
title: Events
description: Typed event objects passed to element handlers.
order: 6
---

# API Reference: Events

Event types are available from `whisker::event` and the prelude. All types are
`#[non_exhaustive]` and tolerate missing optional Host fields by using default
values.

## Base metadata

`Event` contains:

| Field            | Type     | Meaning                            |
| ---------------- | -------- | ---------------------------------- |
| `kind`           | `String` | Event name                         |
| `timestamp`      | `f64`    | Host timestamp in milliseconds     |
| `target`         | `Target` | Element where the event originated |
| `current_target` | `Target` | Element whose handler is running   |

`Target` contains `id`, the Host-independent element `uid`, and a structured
`Dataset`.

## `TouchEvent`

Used by tap, click, and touch handlers. It adds:

- `detail: Point` — current pointer position in surface coordinates
- `pointer_id`, `pointer_type`
- `button`, `buttons`
- `touches`, `changed_touches`

Each `Touch` includes element-local `x/y`, surface `page_x/page_y`, and window
`client_x/client_y` coordinates.

## `ScrollEvent`

`detail: ScrollDetail` includes `scroll_left`, `scroll_top`, content width and
height, viewport width and height, deltas, and `is_dragging`.

List-specific payloads include `ScrollStateChangeEvent`, `SnapEvent`, and
`LayoutCompleteEvent`. Text-specific payloads include `TextLayoutEvent` and
`SelectionChangeEvent`.

## `AnimationEvent`

Animation and transition lifecycle handlers receive `AnimationEvent`. Its
`animation_type` distinguishes `keyframe-animation` from
`transition-animation`; `animation_name` contains the keyframe name or CSS
property.

## `CustomEvent`

Module elements can emit arbitrary structured detail. `CustomEvent` keeps it as
`WhiskerValue`:

```rust
Toggle(on_change: move |event: CustomEvent| {
    let detail = event.detail;
})
```

## Propagation methods

For pointer event name `tap`, `ElementBuilder` supplies:

| Method                 | Phase   | Stops propagation |
| ---------------------- | ------- | ----------------- |
| `on_tap`               | bubble  | no                |
| `on_tap_catch`         | bubble  | yes               |
| `on_capture_tap`       | capture | no                |
| `on_capture_tap_catch` | capture | yes               |

The same matrix exists for click and touch start/move/end/cancel. Scroll events
are target-only and therefore do not have capture/catch variants.

The runtime receives all payloads as `WhiskerValue` and deserializes them into
the declared event type before calling the handler. A malformed payload is
logged and still invokes the handler with that type's default value.
