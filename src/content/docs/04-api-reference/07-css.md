---
title: CSS
description: Structured CSS builders, values, layout policy, and capability coverage.
order: 7
---

# API Reference: CSS

Whisker exposes CSS-shaped styling as structured Rust data. The `Css` builder is
the public contract; `css!` maps named arguments to its methods.

```rust
let style = css!(
    display: Display::Flex,
    flex_direction: FlexDirection::Column,
    width: percent(100),
    padding: px(16),
    background_color: Color::hex(0x1A1A2E),
);

let same_style = Css::builder()
    .display(Display::Flex)
    .flex_direction(FlexDirection::Column)
    .width(percent(100))
    .padding(px(16))
    .background_color(Color::hex(0x1A1A2E));
```

Raw `String` and `&str` styles are not accepted. Whisker never parses CSS text
on the render path: `Css` retains semantic values and keeps their CSS spelling
only for diagnostics.

## Property policy

Whisker uses two explicit baselines:

- **Layout follows Taffy.** Block, flexbox, grid, float, sizing, positioning,
  gaps, and alignment are supported where Taffy can represent their semantics.
- **Non-layout properties follow the useful standard, non-vendor Lynx 4.0
  subset**, with Whisker extensions where native application UI needs them.

The checked [capability registry](https://github.com/whiskerrs/whisker/blob/next-architecture/tests/host-conformance/capabilities.json)
is the exhaustive cross-Host source of truth. It currently covers 154 registered
properties plus custom properties, grouped into:

| Group             | Scope                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Layout core       | Block/flex sizing, box model, alignment, direction, positioning        |
| Grid              | Explicit/implicit tracks, `fr`, minmax, repeat, placement, named areas |
| Float             | Block-formatting-context `float` and `clear`                           |
| Box paint         | Background color, borders, asymmetric radii                            |
| Background layers | Resource images, gradients, repeat/position/size/origin/clip           |
| Visual effects    | Box shadow, clip path, image rendering                                 |
| Backdrop blur     | `none` or one `blur(<length>)`; Android requires API 31+               |
| Transform         | 2D/flat 3D transforms, origins, perspective, motion paths              |
| Compositing       | Opacity, visibility, z order                                           |
| Overflow          | `visible` and `hidden`; scrolling is an element behavior               |
| Text              | Font metrics, shaping options, alignment, decoration, shadow, wrapping |
| Interaction       | Cursor and pointer-events subsets                                      |
| Motion            | Rust timeline, transitions, keyframes, lifecycle events                |

General `filter`, masks, `overflow: scroll/auto`, vendor `-x-*` properties,
subgrid, masonry, and browser-only inline/table layout are outside the core.

## `css!`

Property names are `snake_case` versions of CSS names. Values are typed:

```rust
render! {
    View(style: css!(
        display: Display::Grid,
        grid_template_columns: GridTemplate::tracks([
            GridTrack::fraction(1.0),
            GridTrack::fraction(1.0),
        ]),
        column_gap: px(12),
    )) {
        /* children */
    }
}
```

The macro expands to `Css::builder().property(value)...`; it does not change
style behavior. Method completion and type errors therefore come from normal
Rust builder methods.

## Units

Free functions and extension traits create unit-bearing values:

| Kind       | Free functions                | Method forms                                 |
| ---------- | ----------------------------- | -------------------------------------------- |
| Length     | `px`, `em`, `rem`, `vh`, `vw` | `.px()`, `.em()`, `.rem()`, `.vh()`, `.vw()` |
| Percentage | `percent`                     | `.percent()`                                 |
| Angle      | `deg`, `rad`, `turn`          | `.deg()`, `.rad()`, `.turn()`                |
| Time       | `s`, `ms`                     | `.s()`, `.ms()`                              |

`ZERO` is the unitless zero. Pixel values are logical pixels. Responsive
`rpx`/physical `ppx` units from the former renderer are not part of the current
API.

## Common value types

The main `whisker_css` re-exports include:

- primitives: `Length`, `Percentage`, `LengthPercentage`, `Number`, `Integer`,
  `Angle`, `Time`, `CssString`, and `CalcExpr`;
- color/images: `Color`, `NamedColor`, `Gradient`, `ColorStop`, `ImageRef`, and
  `Background`;
- layout: `Size`, `FlexBasis`, `GridLine`, `GridArea`, `GridTrack`,
  `GridTemplate`, `GridTemplateAreas`, and `Repeated`;
- paint: `Border`, `BorderRadius`, `BoxShadow`, `ClipPath`, and
  `BackdropFilter`;
- motion: `Transform`, `TransformFn`, `Transition`, `Animation`, `Keyframes`,
  and easing/offset-path values.

Keyword values live in enums such as `Display`, `PositionKind`, `Overflow`,
`FlexDirection`, `AlignItems`, `JustifyContent`, `FontWeight`, `TextAlign`, and
`BorderStyle`. The compiler reports unsupported values at the call site.

For exact constructors and variants, use the
[`whisker-css` Rustdoc](https://docs.rs/whisker-css/latest/whisker_css/).

## Color

```rust
let a = Color::hex(0x1A1A2E);
let b = Color::hex_alpha(0x1A1A2ECC);
let c = Color::rgba(255, 0, 0, 0.5);
let d = Color::Named(NamedColor::DodgerBlue);
```

`Color` supports packed hex, RGB/RGBA, HSL/HSLA, named colors, and transparent.

## Composition and last-write-wins

Declarations retain source order. Shorthands expand to longhands, and later
declarations for the same property win during resolution. Use normal builder
composition to make reusable fragments; do not serialize a fragment to text.

## Custom properties

Custom property names use their standard case-sensitive `--name` spelling, but
values stay typed:

```rust
let spacing = CustomPropertyName::new("--spacing").unwrap();

let parent = Css::builder().custom_property(spacing.clone(), px(12));
let child = Css::builder().property_variable(StyleProperty::Width, spacing);
```

Custom properties inherit through the retained element tree. Missing values,
fallbacks, cycles, and type incompatibility are resolved at computed-value time,
matching CSS variable behavior without runtime string parsing. Typed
`custom_var(...)` references can also appear inside gradients, transforms,
filters, and `calc()` values.

## Reactive style

`style` accepts `Css`, `ReadSignal<Css>`, or `RwSignal<Css>`. A computed signal
re-resolves and emits only when its dependencies change:

```rust
let opacity = signal(1.0);
let style = computed(move || css!(opacity: opacity.get()));

render! { View(style: style) }
```

See [Styling](/docs/styling) for the conceptual guide and
[Events](/docs/events) for animation lifecycle callbacks.
