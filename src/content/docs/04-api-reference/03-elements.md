---
title: Elements
description: Built-in tags and the ElementBuilder methods every element shares.
order: 3
---

# API Reference: Elements

Whisker ships a small set of built-in tags, all surfaced through the
prelude. Each is a thin builder over a Lynx element; methods consume
`self` and return it, so calls chain:
`view().style(…).on_tap(…).child(…)`. Inside [`render!`](/docs/macros)
you write them tag-style — `view(style: …, on_tap: …) { … }` — and the
macro lowers each keyword arg to the matching builder method.

Reactive-capable attributes accept any `Into<Signal<T>>` (a static
value, a `ReadSignal`, an `RwSignal`, a `computed`, …) and re-apply
whenever the signal changes. See [Reactivity](/docs/reactivity-api).

> **There is no text-input element yet.** Whisker has no `TextInput` /
> `text_input` built-in. Text is render-only via [`text`](#text).

## Built-in tags

| Tag | Maps to | Notes |
|---|---|---|
| `page` | App root container | Exactly one, outermost. Holds screen-level styles. |
| `view` | Flex container (≈ React Native `<View>`, `<div>`) | The basic layout/grouping box and the usual touch target. |
| `text` | Text container | The only element that renders text on screen. |
| `raw_text` | Leaf glyph node | Created automatically from `text(value: …)`; rarely written by hand. |
| `scroll_view` | Scrolling container | Keeps every child mounted while panning. |
| `list` | Native-virtualised list | Mounts only visible items; scales to thousands of rows. |
| `fragment` | Transparent grouping | No box on screen; hoists children to the nearest real ancestor. |

### `page`

The top-level container Lynx mounts as the root of the app. Use it as
the outermost element returned from a [`#[whisker::main]`](/docs/macros)
function. Lynx treats the page as the viewport, so screen-spanning
styles (`width: 100%`, `background`, …) belong here. There must be
exactly one `page` at the top of the tree.

### `view`

Lynx's flex container — the basic layout primitive. Use it for any
non-text grouping or layout, and as the touch target for `on_tap` /
`on_longpress`.

> **Lynx defaults `flex-direction` to `row`** (not `column` like the
> web). Vertical stacks need an explicit `flex-direction: column`.

### `text`

The only element that renders text. Set the content through
[`value`](#text-specific-methods) (any `Into<Signal<String>>`). Font /
color / size live in the `style` attribute as ordinary CSS. The glyphs
are actually held in a `raw_text` child the builder creates for you.

### `raw_text`

The leaf node that carries actual glyphs. User code rarely names it:
write `text(value: "…")` and the macro emits the `raw_text` child
automatically. Reach for it only when composing mixed-style runs by
hand inside a single `text`.

### `scroll_view`

A scrollable container for content the user can pan past the viewport.
It keeps every child mounted, so for long, *virtualised* lists prefer
[`list`](#list). Direction defaults to `Vertical`; flip it with
[`scroll_orientation`](#text-specific-methods).

### `list`

Lynx's native-virtualised list. It mounts only the visible items onto
platform views and recycles the rest. The builder is **type-stated**:
it takes its item source as three kwargs — `each`, `key`, `children` —
and **does not accept a body** (`list { … }` is rejected by the macro).
All three must be supplied or the chain fails to compile. See
[list builder methods](#text-specific-methods).

### `fragment`

A transparent grouping container. It mounts as a phantom element the
runtime tracks but never forwards to Lynx; its children are hoisted to
the nearest non-phantom ancestor in source order. It carries no
styling, attributes, or events — only `.child(...)`. Whisker's `Show`
and `ForEach` [control flow](/docs/control-flow) both return a
fragment.

## `ElementBuilder` — shared methods

Every built-in tag implements `ElementBuilder`, so the methods below
are available on all of them.

### Style & attributes

| Method | Value type | Lynx attribute |
|---|---|---|
| `style(v)` | `Into<Style>` (a [`Css`](/docs/css) builder, `&str`/`String`, or a reactive signal of either) | inline styles |
| `class(v)` | `Into<Signal<String>>` | `class` |
| `attr(name, v)` | `&'static str`, `Into<Signal<String>>` | *name* (verbatim) |
| `id(v)` | `Into<Signal<String>>` | `id` |
| `name(v)` | `Into<Signal<String>>` | `name` (native `findViewByName`) |
| `data(key, v)` | `&str`, `Into<Signal<String>>` | `data-<key>` (read back via `Target::dataset`) |

`attr` is the catch-all for any Lynx attribute without a named method.

### Accessibility

| Method | Value type | Lynx attribute |
|---|---|---|
| `accessibility_label(v)` | `Into<Signal<String>>` | `accessibility-label` |
| `accessibility_trait(v)` | `Into<Signal<`[`AccessibilityTrait`](/docs/attributes)`>>` | `accessibility-trait` |
| `accessibility_element(v)` | `Into<Signal<bool>>` | `accessibility-element` |
| `accessibility_elements(v)` | `Into<Signal<String>>` | `accessibility-elements` (focus order by id list) |
| `accessibility_elements_hidden(v)` | `Into<Signal<bool>>` | `accessibility-elements-hidden` |
| `accessibility_exclusive_focus(v)` | `Into<Signal<bool>>` | `accessibility-exclusive-focus` |
| `a11y_id(v)` | `Into<Signal<String>>` | `a11y-id` |

### Interaction & exposure

| Method | Value type | Lynx attribute |
|---|---|---|
| `user_interaction_enabled(v)` | `Into<Signal<bool>>` | `user-interaction-enabled` |
| `event_through(v)` | `Into<Signal<bool>>` | `event-through` (pass touches through) |
| `exposure_id(v)` | `Into<Signal<String>>` | `exposure-id` |
| `exposure_scene(v)` | `Into<Signal<String>>` | `exposure-scene` |
| `exposure_area(v)` | `Into<Signal<String>>` | `exposure-area` (e.g. `"0.5"` / `"50%"`) |

### Gesture tuning

These advanced attrs tune what reaches the Lynx hit-tester / native
scroll. Most apps never set them.

| Method | Value type | Lynx attribute |
|---|---|---|
| `hit_slop(v)` | `Into<Signal<String>>` | `hit-slop` |
| `native_interaction_enabled(v)` | `Into<Signal<bool>>` | `native-interaction-enabled` |
| `block_native_event(v)` | `Into<Signal<bool>>` | `block-native-event` |
| `consume_slide_event(v)` | `Into<Signal<String>>` | `consume-slide-event` |
| `pan_intercept_direction(v)` | `Into<Signal<`[`PanInterceptDirection`](/docs/attributes)`>>` | `pan-intercept-direction` |
| `pan_intercept_scope(v)` | `Into<Signal<`[`PanInterceptScope`](/docs/attributes)`>>` | `pan-intercept-scope` |
| `flatten(v)` | `Into<Signal<bool>>` | `flatten` (Android: force a real View) |

### Touch events

Each touch-family event exposes **four variants** that map 1:1 onto
Lynx's four handler kinds:

| Variant | Lynx handler | Phase | Stops propagation |
|---|---|---|---|
| `on_<event>` | `bind<event>` | bubble (bottom-up) | no |
| `on_<event>_catch` | `catch<event>` | bubble | **yes** |
| `on_capture_<event>` | `capture-bind<event>` | capture (top-down) | no |
| `on_capture_<event>_catch` | `capture-catch<event>` | capture | **yes** |

All four take `Fn(`[`TouchEvent`](/docs/events)`)` and run through
Lynx's native propagation chain. The base events:

| Event | Fires when |
|---|---|
| `on_tap` | single tap (won't fire if the finger moved far) |
| `on_longpress` | ~500ms press (mutually exclusive with `tap`) |
| `on_click` | click on the nearest listening node |
| `on_touchstart` | finger touches the surface |
| `on_touchmove` | finger moves on the surface |
| `on_touchend` | finger leaves the surface |
| `on_touchcancel` | touch interrupted by the system / a gesture |

Each of the seven has its `_catch`, `on_capture_*`, and
`on_capture_*_catch` companions.

### Lifecycle events

These take `Fn(`[`CustomEvent`](/docs/events)`)` (bubble phase only).

| Method | Fires when |
|---|---|
| `on_layoutchange` | position reported after layout completes |
| `on_uiappear` | node entered the visible screen area |
| `on_uidisappear` | node left the visible screen area |

### Animation & transition events

These take `Fn(`[`AnimationEvent`](/docs/events)`)` (bubble phase only).

| Method | Fires when |
|---|---|
| `on_animationstart` | keyframe animation began |
| `on_animationend` | keyframe animation completed |
| `on_animationcancel` | keyframe animation interrupted |
| `on_animationiteration` | keyframe animation cycle boundary |
| `on_transitionstart` | transition began |
| `on_transitionend` | transition completed |
| `on_transitioncancel` | transition interrupted |

### Generic / escape hatch

| Method | Signature | Purpose |
|---|---|---|
| `on(event, f)` | `&'static str`, `Fn(`[`WhiskerValue`](/docs/platform-modules)`)` | bind any event by name (bubble, doesn't stop) |
| `bind(event, bind_type, f)` | `&'static str`, `BindType`, `Fn(WhiskerValue)` | bind any event with an explicit `BindType` |
| `child(el)` | [`Element`](/docs/overview) | append a child handle |
| `bind_ref(r)` | [`ElementRef`](/docs/refs) | bind a ref so its methods can be invoked after mount |

`BindType` is `Bind`, `Catch`, `CaptureBind`, or `CaptureCatch` — the
same four phases as the touch-event variants above.

## Tag-specific methods

### `text`

| Method | Value type | Lynx attribute / event |
|---|---|---|
| `value(v)` | `Into<Signal<String>>` | the text string (creates a `raw_text` child) |
| `text_maxline(v)` | `Into<Signal<i32>>` | `text-maxline` (-1 = unlimited) |
| `text_selection(v)` | `Into<Signal<bool>>` | `text-selection` |
| `include_font_padding(v)` | `Into<Signal<bool>>` | `include-font-padding` (Android) |
| `tail_color_convert(v)` | `Into<Signal<bool>>` | `tail-color-convert` |
| `text_single_line_vertical_align(v)` | `Into<Signal<`[`TextVerticalAlign`](/docs/attributes)`>>` | `text-single-line-vertical-align` |
| `custom_context_menu(v)` | `Into<Signal<bool>>` | `custom-context-menu` |
| `custom_text_selection(v)` | `Into<Signal<bool>>` | `custom-text-selection` |
| `on_layout(f)` | `Fn(`[`TextLayoutEvent`](/docs/events)`)` | `layout` (line count, ranges, size) |
| `on_selectionchange(f)` | `Fn(`[`SelectionChangeEvent`](/docs/events)`)` | `selectionchange` |

### `raw_text`

| Method | Value type | Lynx attribute |
|---|---|---|
| `text(v)` | `Into<Signal<String>>` | `text` (the glyph string) |

### `scroll_view`

| Method | Value type | Lynx attribute / event |
|---|---|---|
| `scroll_orientation(v)` | `Into<Signal<`[`ScrollOrientation`](/docs/attributes)`>>` | `scroll-orientation` (default `Vertical`) |
| `bounces(v)` | `Into<Signal<bool>>` | `bounces` |
| `enable_scroll(v)` | `Into<Signal<bool>>` | `enable-scroll` |
| `scroll_bar_enable(v)` | `Into<Signal<bool>>` | `scroll-bar-enable` |
| `initial_scroll_offset(v)` | `Into<Signal<i32>>` | `initial-scroll-offset` (px) |
| `initial_scroll_to_index(v)` | `Into<Signal<i32>>` | `initial-scroll-to-index` |
| `upper_threshold(v)` | `Into<Signal<i32>>` | `upper-threshold` (px) |
| `lower_threshold(v)` | `Into<Signal<i32>>` | `lower-threshold` (px) |
| `on_scroll(f)` | `Fn(`[`ScrollEvent`](/docs/events)`)` | `scroll` |
| `on_scrolltoupper(f)` | `Fn(ScrollEvent)` | `scrolltoupper` |
| `on_scrolltolower(f)` | `Fn(ScrollEvent)` | `scrolltolower` |
| `on_scrollend(f)` | `Fn(ScrollEvent)` | `scrollend` |
| `on_contentsizechanged(f)` | `Fn(ScrollEvent)` | `contentsizechanged` |

### `list`

The three render-props are type-stated — supply all of them.

| Method | Value type | Role |
|---|---|---|
| `each(f)` | `Fn() -> Vec<T>` | the reactive item source |
| `key(f)` | `Fn(&T) -> K` (`K: Eq + Hash + Clone`) | stable per-item identity |
| `children(f)` | `Fn(T) -> Element` | renders one item |

Plus the layout attributes:

| Method | Value type | Lynx attribute |
|---|---|---|
| `list_type(v)` | `Into<Signal<`[`ListType`](/docs/attributes)`>>` | `list-type` (default `Single`) |
| `column_count(v)` | `Into<Signal<i32>>` | `column-count` (default 1) |
| `span_count(v)` | `Into<Signal<i32>>` | `span-count` (newer builds; set with `column_count`) |
| `vertical_orientation(v)` | `Into<Signal<bool>>` | `vertical-orientation` (default `true`) |

## Example

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    let count = RwSignal::new(0_i32);

    render! {
        page(style: "background: white;") {
            view(
                style: "flex-direction: column; padding: 16px; gap: 8px;",
            ) {
                text(
                    style: "font-size: 20px; color: black;",
                    value: computed(move || format!("count: {}", count.get())),
                )
                view(on_tap: move |_| count.update(|n| *n += 1)) {
                    text(value: "+1")
                }
            }
            scroll_view(
                style: "flex: 1;",
                scroll_orientation: ScrollOrientation::Vertical,
                on_scroll: move |_| {},
            ) {
                view(style: "flex-direction: column;") {
                    text(value: "scrollable content")
                }
            }
        }
    }
}
```

See [Events](/docs/events) for the typed event objects, [Attributes](/docs/attributes)
for the enum props, [CSS](/docs/css) for `style` / `css!`, and
[Imperative & Refs](/docs/refs) for `bind_ref`.
