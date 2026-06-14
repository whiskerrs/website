---
title: CSS
description: The css! macro, the Css builder, keyword enums, units, and color.
order: 7
---

# API Reference: CSS

Styling in Whisker is plain CSS, applied through the `style:` attribute on
any element. You can write it two ways:

- The typed **`css!`** macro — `css!(display: Display::Flex, gap: 12.px())` — which
  builds a [`Css`](#the-css-builder) declaration block at compile time with
  IDE completion and type-checked values.
- A **raw CSS string** — `style: "display: flex; gap: 12px;"` — for quick
  one-offs or styles you build dynamically.

Both forms are accepted wherever a `style:` is taken; see
[Attributes](/docs/attributes) for where styles attach.

Layout, painting, and animation are run by the Lynx engine, so the property
set mirrors Lynx's CSS surface (flexbox, grid, gradients, transforms,
transitions, animations) rather than the full web platform. Two defaults are
worth remembering up front:

- `flex-direction` defaults to **`row`** — declare `flex_direction: column`
  on any vertical stacking container.
- `<view>` defaults to `display: linear` (Lynx's own stacking layout); set
  `display: flex` to opt into CSS flexbox semantics.

> These CSS keyword enums (`Display`, `FlexDirection`, …) are distinct from
> the element-attribute enums documented in [Attributes](/docs/attributes)
> (`ListType`, `ScrollOrientation`, …). They live in different modules and
> are not interchangeable.

All symbols below are re-exported from `whisker_css` (and the common ones
from the [prelude](/docs/overview)). Unit helpers come from
`whisker_css::ext`.

## The `css!` macro

`css!(name: value, …)` is keyword syntax for the [`Css`](#the-css-builder)
builder. It lowers to a `Css::new().name(value)…` chain — one builder method
call per property, in order.

- Property names are **snake_case** (`flex_direction`, `background_color`,
  `border_radius`), mapping to the CSS kebab-case names.
- Values are the typed CSS enums, [units](#units--number-extensions), and
  [data types](#data-types) from this page.

```rust
use whisker::prelude::*;

let style = css!(
    display: Display::Flex,
    flex_direction: FlexDirection::Column,
    align_items: AlignItems::Center,
    gap: 12.px(),
    padding: 16.px(),
    background_color: Color::hex(0x1A1A2E),
    border_radius: 10.px(),
);

render! {
    view(style: style) {
        text(value: "Hello")
    }
}
```

See [Macros](/docs/macros#cssname-value-) for the macro's place among the
other Whisker macros.

## The `Css` builder

`Css` is a type-safe style declaration block. Each builder method serializes
its argument via [`ToCss`](#tocss) and appends one declaration, returning
`Self` so calls chain fluently. The `css!` macro is sugar over this; you can
also build a `Css` by hand.

```rust
use whisker_css::{Css, FlexDirection, Color};
use whisker_css::ext::*;

let s = Css::new()
    .display_flex()
    .flex_direction(FlexDirection::Column)
    .padding(px(12))
    .background_color(Color::hex(0x1A1A2E))
    .border_radius(px(10));
```

Shorthand methods expand to their constituent longhands, so the
last-write-wins rule applies per longhand exactly as a CSS author expects.

| Symbol | Kind | Purpose |
|---|---|---|
| `Css` | struct | The style declaration block; chainable builder, one method per CSS longhand. |
| `CssProp` | struct | One serialized declaration (`name()` / `value()`). Built only by `Css`; the representation is opaque. |
| `ToCss` | trait | Serialization trait implemented by every value type. |

### `ToCss`

The trait every CSS value type implements:

| Method | Returns | Notes |
|---|---|---|
| `to_css(&self, dest: &mut dyn fmt::Write)` | `fmt::Result` | Writes the CSS source form into a sink. |
| `to_css_string(&self)` | `String` | Convenience wrapper that allocates and returns the text. |

## Units & number extensions

Numeric literals get their unit through extension traits and free functions
in `whisker_css::ext`. `i32` widens silently to `f32`, so `8.px()` and
`8.0.px()` are interchangeable. Bring them in with `use whisker_css::ext::*;`
(the unit methods are also in the [prelude](/docs/overview)).

```rust
use whisker_css::ext::*;

let a = 12.px();      // 12px
let b = px(12);       // 12px (free-function form)
let c = 0.5.rem();    // 0.5rem
let d = 50.percent(); // 50%
let e = 90.deg();     // 90deg
let f = 300.ms();     // 300ms
```

### Free functions

Each returns a typed value (`Length`, `Percentage`, `Angle`, or `Time`):

| Function | Result | Unit |
|---|---|---|
| `px(n)` | `Length` | logical pixels |
| `rpx(n)` | `Length` | Lynx responsive pixel (`750rpx` = device width) |
| `ppx(n)` | `Length` | physical pixel |
| `em(n)` | `Length` | `em` |
| `rem(n)` | `Length` | `rem` |
| `vh(n)` | `Length` | viewport height |
| `vw(n)` | `Length` | viewport width |
| `percent(n)` | `Percentage` | `%` |
| `deg(n)` | `Angle` | degrees |
| `rad(n)` | `Angle` | radians |
| `turn(n)` | `Angle` | turns |
| `s(n)` | `Time` | seconds |
| `ms(n)` | `Time` | milliseconds |

`ZERO` is a `const Length` — the only length CSS allows without a unit.

### Method-style extension traits

The same constructors, as methods on any number (`i32`, `f32`, `u32`):

| Trait | Methods | Result |
|---|---|---|
| `IntoF32` | `into_f32()` | internal widening to `f32` for value construction |
| `LengthExt` | `.px()`, `.rpx()`, `.ppx()`, `.em()`, `.rem()`, `.vh()`, `.vw()` | `Length` |
| `PercentExt` | `.percent()` | `Percentage` |
| `AngleExt` | `.deg()`, `.rad()`, `.turn()` | `Angle` |
| `TimeExt` | `.s()`, `.ms()` | `Time` |

## Keyword enums

Closed enums for property keyword values, from the `keyword` module. Values
Lynx rejects (e.g. `position: static`, `overflow: scroll`) are intentionally
absent so they fail to compile rather than warn at runtime.

### Layout

| Enum | Purpose |
|---|---|
| `Display` | The `display` value (see variants below). |
| `PositionKind` | The `position` value (no `static` — Lynx defaults to `relative`). |
| `Overflow` | `overflow` behavior. |
| `Visibility` | `visibility`. |
| `BoxSizing` | `box-sizing`. |
| `PointerEvents` | `pointer-events`. |

`Display` variants: `None`, `Flex`, `Grid`, `Linear` (default for `<view>`),
`Relative`.

### Flex

| Enum | Purpose |
|---|---|
| `FlexDirection` | Main-axis direction. |
| `FlexWrap` | Single- vs multi-line wrapping. |
| `JustifyContent` | Main-axis alignment. |
| `AlignItems` | Cross-axis alignment of items. |
| `AlignSelf` | Per-item override of `AlignItems` (adds `Auto`). |
| `AlignContent` | Cross-axis alignment of wrapped lines. |

`FlexDirection` variants: `Row` (default), `RowReverse`, `Column`,
`ColumnReverse`.

`JustifyContent` variants: `Stretch`, `FlexStart` (default), `FlexEnd`,
`Center`, `SpaceBetween`, `SpaceAround`, `SpaceEvenly`, `Start`, `End`.

`AlignItems` variants: `Stretch` (default), `FlexStart`, `FlexEnd`,
`Center`, `Baseline`, `Start`, `End`.

### Typography

| Enum | Purpose |
|---|---|
| `FontStyle` | `font-style`. |
| `FontWeight` | `font-weight`. |
| `FontVariant` | `font-variant`. |
| `Cursor` | `cursor`. |

### Text

| Enum | Purpose |
|---|---|
| `TextAlign` | `text-align`. |
| `TextDecorationLine` | `text-decoration-line`. |
| `TextDecorationStyle` | `text-decoration-style`. |
| `TextOverflow` | `text-overflow`. |
| `TextTransform` | `text-transform`. |
| `VerticalAlign` | `vertical-align`. |
| `Direction` | `direction` (text direction). |
| `WhiteSpace` | `white-space`. |
| `WordBreak` | `word-break`. |
| `WordWrap` | `word-wrap`. |

### Border

| Enum | Purpose |
|---|---|
| `BorderStyle` | `border-style`. |

### Background

| Enum | Purpose |
|---|---|
| `BackgroundRepeat` | `background-repeat`. |
| `BackgroundClip` | `background-clip`. |
| `BackgroundOrigin` | `background-origin`. |
| `BackgroundAttachment` | `background-attachment`. |
| `BackgroundSize` | `background-size` keyword form. |

### Grid

| Enum | Purpose |
|---|---|
| `GridAutoFlow` | `grid-auto-flow`. |

### Linear (Lynx linear layout)

| Enum | Purpose |
|---|---|
| `LinearOrientation` | `linear-orientation` (stacking axis). |
| `LinearGravity` | `linear-gravity`. |
| `LinearCrossGravity` | `linear-cross-gravity`. |
| `LinearLayoutGravity` | `linear-layout-gravity`. |

### Transform

| Enum | Purpose |
|---|---|
| `TransformBox` | `transform-box`. |
| `TransformStyle` | `transform-style`. |
| `BackfaceVisibility` | `backface-visibility`. |

### Animation

| Enum | Purpose |
|---|---|
| `AnimationDirection` | `animation-direction`. |
| `AnimationFillMode` | `animation-fill-mode`. |
| `AnimationIterationCount` | `animation-iteration-count`. |
| `AnimationPlayState` | `animation-play-state`. |
| `TransitionPropertyKind` | The property a `transition` targets. |

## Data types

Structured CSS value types from the `data_type` module (with
`data_type_ext` for the inline types Lynx does not document standalone).

| Type | Purpose |
|---|---|
| `Angle` | An `<angle>` (`Deg`, `Rad`, `Turn`). |
| `CalcExpr` | A `calc()` expression. |
| `Color` | A `<color>` — see below. |
| `ColorStop` | One color stop in a gradient. |
| `CssString` | A quoted CSS string (e.g. `content`, font family). |
| `FitContent` | The `fit-content()` sizing function. |
| `Gradient` | A `<gradient>` image (linear/radial). |
| `Length` | A `<length>` (`Px`, `Rpx`, `Ppx`, `Em`, `Rem`, `Vh`, `Vw`, `Zero`). |
| `LengthPercentage` | A value that may be a length or a percentage. |
| `LinearDirection` | Direction of a linear gradient. |
| `MaxContent` | The `max-content` sizing keyword. |
| `NamedColor` | One of the 147 CSS named colors — see below. |
| `Number` | A unit-less `<number>`. |
| `Percentage` | A `<percentage>` (`50%`). |
| `RadialShape` | Shape of a radial gradient. |
| `StopPosition` | Position of a gradient stop. |
| `Time` | A `<time>` (`S`, `Ms`). |
| `EasingFunction` | A transition/animation easing function. |
| `Integer` | An `<integer>`. |
| `Position` | A `<position>` (background/object position). |

### `Color`

`Color` covers every color form Lynx accepts: named colors, `transparent`,
`rgb()`/`rgba()`, and `hsl()`/`hsla()`. Wide-gamut Level 4 forms
(`currentColor`, `hwb()`, `lab()`, `oklch()`, `color()`) are intentionally
absent and will not compile.

| Constructor | Form |
|---|---|
| `Color::hex(0xRRGGBB)` | 24-bit packed RGB, fully opaque. |
| `Color::hex_alpha(0xRRGGBBAA)` | 32-bit packed RGBA. |
| `Color::rgb(r, g, b)` | 8-bit channels, opaque. |
| `Color::rgba(r, g, b, a)` | 8-bit channels with alpha `0.0..=1.0`. |
| `Color::hsl(h_deg, s%, l%)` | HSL, opaque. |
| `Color::Named(NamedColor::…)` | A named color. |
| `Color::Transparent` | Fully transparent. |

```rust
use whisker_css::{Color, NamedColor};

let a = Color::hex(0x1A1A2E);
let b = Color::hex_alpha(0x1A1A2ECC);
let c = Color::rgba(255, 0, 0, 0.5);
let d = Color::Named(NamedColor::DodgerBlue);
```

### `NamedColor`

The full CSS named-color set (147 colors), usable directly as a `Color`
value via `Color::Named(...)`, e.g. `NamedColor::White`,
`NamedColor::DodgerBlue`.

## Shorthands

Compound builders from the `shorthand` module, for properties whose CSS
shorthand combines multiple longhands. Each expands to its constituent
longhands when applied.

| Type | Shorthand |
|---|---|
| `Animation` | `animation`. |
| `Background` | `background`. |
| `BackgroundLayer` | One layer within a `background`. |
| `Border` | `border`. |
| `Flex` | `flex`. |
| `Margin` | `margin`. |
| `MarginValue` | One side of a `margin` (length, percentage, or `auto`). |
| `Padding` | `padding`. |
| `Transform` | `transform` (a list of `TransformFn`). |
| `TransformFn` | A single transform function (`translate`, `rotate`, `scale`, …). |
| `Transition` | `transition`. |

## Value helpers

Higher-level value types from the `value` module that model a single
property's accepted grammar.

| Type | Property |
|---|---|
| `BorderRadius` | `border-radius` (one to four corners). |
| `FlexBasis` | `flex-basis`. |
| `GridLine` | A `grid-row` / `grid-column` line. |
| `GridTemplate` | `grid-template-rows` / `-columns`. |
| `ImageRef` | An image reference (URL or gradient) for `background-image`. |
| `LineHeight` | `line-height` (number or length). |
| `Repeated` | A repeated track list (`repeat()`). |
| `Size` | A `width` / `height` value. |
