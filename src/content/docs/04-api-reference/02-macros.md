---
title: Macros
description: Entry points, components, composition syntax, modules, and formatting.
order: 2
---

# API Reference: Macros

Whisker keeps macro responsibilities narrow. `compose!` owns the common
named-argument/body grammar; `render!`, `css!`, and `routes!` adapt that grammar
to public builders. Every generated call can also be written as ordinary Rust.

## `#[whisker::main]`

Marks the single application entry point:

```rust
#[whisker::main]
fn app() -> Element {
    render! { Root }
}
```

The macro generates the platform entry symbols and hot-reload anchor needed by
the Hosts. The function takes no arguments and returns `Element`.

## `#[component]`

Turns a function into a reactive component and generates a PascalCase builder.

```rust
#[component]
fn badge(label: Signal<String>, emphasis: Option<bool>) -> Element {
    render! { Text(value: label) }
}

let element = Badge::builder()
    .label("new")
    .emphasis(true)
    .build();
```

- ordinary parameters are required builder setters;
- `Option<T>` is optional and defaults to `None`;
- `#[prop(default = expression)]` makes a parameter optional with that default;
- `children: Children` adds a trailing `.body(...)` method;
- required props are enforced by Rust type state at `build()`;
- props must be cloneable so the body can be safely remounted by hot reload.

Inside composition syntax, call the generated PascalCase name:

```rust
render! { Badge(label: "new") }
```

## `#[whisker::module_element]`

Defines the Rust authoring side of a Host-backed element. It generates the same
builder shape as `#[component]`, plus an element schema for properties, events,
measurement, and commands. Host implementations register the same module and
element names on Android, iOS, Web, or Desktop.

```rust
#[whisker::module_element(
    name = "acme.maps/Map",
    measurement = Custom,
    commands = [("setCamera", Object)],
)]
fn map(latitude: Signal<f64>, longitude: Signal<f64>, on_region_change: CustomEvent) {}
```

Use this only when the element owns a Host view or Host-specific presentation.
A pure Rust composition remains a normal `#[component]`.

## `compose!`

The generic composition macro lowers one builder tree:

```rust
compose! {
    View(style: style) {
        Text(value: "hello")
    }
}
```

Each node must provide:

```text
Type::builder()
    .named_argument(value)
    .body(|body| { body.push(child); }) // only when a body is present
    .build()
```

This protocol does not know which types are UI elements. Libraries may expose
their own compatible builders and use them from the same macro.

## `render!`

The UI-named adapter over `compose!`:

```rust
render! {
    View(style: css!(padding: px(16))) {
        Text(value: "Hello")
        {optional_element}
        ..more_elements
    }
}
```

Named arguments use `name: expression`; the trailing body is optional. A node
with no arguments may omit parentheses: `render! { Root }`.

## `css!`

Builds `Css` by mapping names to builder methods:

```rust
let style = css!(
    width: percent(100),
    padding: px(16),
    background_color: Color::hex(0x2563EB),
);
```

Equivalent to `Css::builder().width(...).padding(...)...`. It accepts
structured values only.

## `routes!`

Provided by `whisker-router`. It uses the same composition grammar to build a
route tree; router-specific path and nesting validation happens during macro
expansion. See [Routing API](/docs/routing-api).

## `module!("Name")`

Creates a handle to a function-shaped Host module, prefixed by the calling
crate's package name:

```rust
let store = whisker::module!("LocalStore");
let result = store.invoke("get", vec!["token".into()]);
```

Arguments, results, and event payloads use `WhiskerValue`. Prefer a typed public
wrapper in a reusable module crate rather than exposing string method names to
application code.

## Formatting

`whisker fmt` delegates ordinary Rust to rustfmt and formats composition macro
bodies with the same width and indentation settings. See
[Formatting](/docs/formatting).
