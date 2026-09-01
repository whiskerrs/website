---
title: Components & render!
description: Element builders, render! syntax, components, props, and children.
order: 1
---

# Components & `render!`

A Whisker UI declaration builds a tree of small [`Element`](/docs/elements)
handles. Built-in elements and user components both expose ordinary Rust
builders; `render!` adds named-argument and nested-body syntax on top.

```rust
use whisker::prelude::*;

render! {
    View(style: css!(padding: px(16))) {
        Text(value: "Hello, Whisker")
        View(on_tap: move |_| println!("tapped")) {
            Text(value: "Tap me")
        }
    }
}
```

The same tree can be built without the macro:

```rust
View::builder()
    .style(css!(padding: px(16)))
    .body(|body| {
        body.push(Text::builder().value("Hello, Whisker").build());
    })
    .build()
```

`render!` does not special-case `View`, `Text`, or your component names. Every
node follows the same `Type::builder().prop(value).body(...).build()` contract.

## Syntax

- Named arguments go in parentheses: `View(style: style, on_tap: handler)`.
- Children go in a trailing body: `View { Text(value: "hi") }`.
- Parentheses are optional when there are no named arguments.
- A Rust expression child is written as `{expression}`; an iterable can be
  spread with `..items`.
- Text literals and primitive values can be children where text content is
  accepted. `Text(value: ...)` is the explicit text element form.

Use [`whisker fmt`](/docs/formatting) to format composition bodies. Plain
`rustfmt` deliberately leaves macro contents untouched.

## App entry point

Each app has one `#[whisker::main]` function. Keep it small and mount a root
component so that component-level hot reload can preserve state:

```rust
#[whisker::main]
fn app() -> Element {
    render! { Root }
}

#[component]
fn root() -> Element {
    render! { View { Text(value: "It works") } }
}
```

## Defining components

Annotate an idiomatic `snake_case` function with `#[component]`. The macro
generates a PascalCase marker, a props type, and a public builder:

```rust
#[component]
fn greeting(name: Signal<String>, excited: Option<bool>) -> Element {
    let suffix = if excited.unwrap_or(false) { "!" } else { "" };
    render! { Text(value: computed(move || format!("Hello, {}{suffix}", name.get()))) }
}

render! {
    Greeting(name: "world", excited: true)
}
```

`Greeting(...)` lowers to `Greeting::builder()...build()`. Required props are
tracked in the builder type state, so omitting `name` is a compile-time error.
`Option<T>`, `Children`, and props with `#[prop(default = ...)]` may be omitted.
Required and optional props may appear in any order.

The component function runs when it mounts. Signals and computed properties
then update their exact renderer bindings; Whisker does not repeatedly diff a
virtual tree. A hot-reload patch may remount the affected component when its
body changes, while preserving compatible surrounding state.

## Static and reactive props

A prop typed `Signal<T>` accepts either a plain `T` or a signal handle:

```rust
let count = signal(0);

render! {
    Badge(label: "items") // static
    Counter(value: count) // reactive
}
```

Inside the component, `value.get()` participates in dependency tracking. If a
built-in builder receives a signal directly, it installs the effect needed to
reapply that property. Passing `count.get()` instead passes a one-time snapshot.

## Defaults and children

```rust
#[component]
fn card(
    #[prop(default = px(16))] padding: Length,
    children: Children,
) -> Element {
    render! {
        View(style: css!(padding: padding)) {
            {children()}
        }
    }
}

render! {
    Card {
        Text(value: "Inside the card")
    }
}
```

A `children: Children` parameter adds the builder's trailing `body` method.
`Children` is reusable, so framework-level components can project it more than
once, although ordinary layout components usually call it once.

## What's next

- [Styling](/docs/styling)
- [State Management](/docs/state-management)
- [Lists & Conditionals](/docs/lists-and-conditionals)
- [Macro Reference](/docs/macros)
