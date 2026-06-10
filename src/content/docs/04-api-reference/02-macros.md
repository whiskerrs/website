---
title: Macros
description: The five proc macros and the module! helper.
order: 2
---

# API Reference: Macros

Whisker ships five procedural macros plus one declarative macro. All are
re-exported from the crate root and prelude.

## `#[whisker::main]`

Marks the app entry point. Wraps a `fn() -> Element` and generates the
FFI symbols the iOS/Android host calls into.

```rust
#[whisker::main]
fn app() -> Element {
    render! { page { text(value: "Hello") } }
}
```

- The function takes no arguments and returns [`Element`](/docs/elements).
- It runs **once** at mount; subsequent updates happen through the
  reactive runtime, not by re-calling this function.
- There must be exactly one `#[whisker::main]` in an app.

## `#[component]`

Defines a reusable component. Generates a typed `XxxProps` builder and a
PascalCase alias usable inside `render!`.

```rust
#[component]
fn badge(label: Signal<String>, count: i32) -> Element {
    render! {
        view { text(value: label) }
    }
}

// Call site, inside another render!:
render! { Badge(label: "items", count: 3) }
```

- **Naming**: define the function in `lower_snake_case` (`fn badge`,
  `fn todo_list`); the macro generates the `PascalCase` alias
  (`Badge`, `TodoList`) used at the `render!` call site.
- Each parameter becomes a prop. Call sites pass them as keyword
  arguments (`Badge(label: …, count: …)`); positional calls are not
  supported.
- Prop attributes:
  - `#[prop(default = expr)]` — supply a default so the prop is optional.
  - `#[prop(into)]` behavior is automatic for most types; a prop whose
    type is a bare generic parameter skips `into` to keep inference
    working.
- `Option<T>` props and `children: Children` props default to
  empty/`None` automatically.
- A **missing required prop** is reported at component mount time, not at
  compile time (a deliberate trade-off for cleaner editor completion).
- Read reactive props with [`.get()`](/docs/reactivity-api#signal-prop-type);
  see [`Signal<T>`](/docs/reactivity-api#signal-prop-type) for the
  value-or-signal prop type.

### Children

A `children: Children` parameter receives the nested content a caller
passes in `render!`:

```rust
#[component]
fn card(children: Children) -> Element {
    render! { view(class: "card") { children() } }
}
```

## `#[whisker::module_component("Name")]`

Wraps a native **view** module (an iOS/Android widget) as a Whisker
component. The macro generates the body that mounts the native element
and applies each prop as an attribute or style.

```rust
#[whisker::module_component("Image")]
pub fn image(src: Signal<String>, mode: Signal<ImageMode>) {}
```

Used by first-party modules like [`whisker-image`](/docs/modules-api).
For most apps you consume these components, you don't write them — see
[Authoring a Module](/docs/authoring-a-module) when you do.

## `render! { … }`

The view-construction macro. It looks JSX-like but lowers to imperative
element-creation calls plus the effects that wire reactive props.

```rust
render! {
    page(style: "padding: 16px;") {
        text(value: greeting)
        view(on_tap: move |_| count.update(|n| *n += 1)) {
            text(value: "+1")
        }
    }
}
```

Grammar essentials:

- **Keyword args go in parentheses**: `view(style: …, on_tap: …) { … }`.
  Children go in the braces.
- A tag with only children can omit the parens: `page { text(…) }`.
- **Dynamic vs static** is decided by what you pass: a signal handle →
  reactive; a value or `signal.get()` → static snapshot. See
  [Handling Events](/docs/events) and [Reactivity](/docs/reactivity-api).
- Bare string literals and bare `{expr}` blocks as children are
  rejected — wrap text in `text(value: …)`.

Full tag and method list: [Elements](/docs/elements).

## `css!(name: value, …)`

Keyword syntax for the [`Css`](/docs/css) builder. Lowers to a
`Css::new().name(value)…` chain.

```rust
let style = css!(
    display: flex,
    flex_direction: column,
    gap: 12.px(),
    background: NamedColor::White,
);
```

Property names are snake_case (`flex_direction`), values are the typed
CSS enums and units. Full list: [CSS](/docs/css).

## `module!("Name")`

A declarative macro that builds a [`PlatformModule`](/docs/platform-modules)
handle for a function-shaped native module. The calling crate's name is
prepended so two crates can ship same-named modules without colliding.

```rust
let store = whisker::module!("WhiskerLocalStore"); // -> "<crate>:WhiskerLocalStore"
let saved = store.invoke("save", vec![key.into(), value.into()]);
```

See [Platform Modules](/docs/platform-modules) for `invoke` / `invoke_async`
and the [`WhiskerValue`](/docs/platform-modules#whiskervalue) argument
model.
