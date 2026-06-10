---
title: Components & render!
description: How views are built — the render! macro, components, props, and children.
order: 1
---

# Components & `render!`

A Whisker UI is a tree of **components**. Each component is a plain Rust
function that returns an [`Element`](/docs/elements) by describing its
view with the `render!` macro. Components run **once** when they mount;
after that, fine-grained [signals](/docs/state-management) update only
the attributes that change — there is no re-render of the whole function.

## The `render!` macro

`render!` looks like markup but is ordinary Rust. Tags take keyword
arguments in parentheses and children in braces:

```rust
use whisker::prelude::*;

render! {
    page(style: "padding: 16px;") {
        text(value: "Hello, Whisker")
        view(on_tap: move |_| println!("tapped")) {
            text(value: "Tap me")
        }
    }
}
```

- **Attributes** (`style`, `on_tap`, `value`, …) go in the parentheses.
- **Children** go in the braces. A tag with only children can drop the
  parens: `view { text(value: "hi") }`.
- Children must be elements — bare string literals aren't allowed; wrap
  text in `text(value: …)`.

The full tag list and every builder method live in the
[Elements reference](/docs/elements); the macro grammar is in the
[Macros reference](/docs/macros).

## The app entry point

Every app has exactly one `#[whisker::main]` function — the root of the
tree:

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    render! {
        page {
            text(value: "It works")
        }
    }
}
```

## Defining a component

Annotate a function with `#[component]`. Its parameters become **props**,
passed as keyword arguments at the call site:

```rust
#[component]
fn greeting(name: Signal<String>) -> Element {
    render! {
        text(value: name)
    }
}

#[whisker::main]
fn app() -> Element {
    render! {
        page {
            Greeting(name: "world")
        }
    }
}
```

> **Naming.** Define the function in idiomatic Rust `lower_snake_case`
> (`fn greeting`, `fn todo_list`). The `#[component]` macro generates a
> `PascalCase` alias (`Greeting`, `TodoList`) which is the name you call
> inside `render!`. So a `fn todo_list` component is written
> `TodoList(...)` at the call site. The PascalCase call name is also how
> the macro tells your components apart from built-in tags like `view`.

### Props are values or signals

A prop typed `Signal<T>` accepts **either** a plain value (static) **or**
a reactive signal. Pass a value and the prop never changes; pass a
signal and the component updates when it changes:

```rust
let count = RwSignal::new(0);

render! {
    // static — set once
    Badge(label: "items")
    // reactive — re-renders when `count` changes
    Counter(value: count)
}
```

Read a `Signal<T>` prop inside the component with `.get()`. This
value-or-signal type is described in
[The Signal prop type](/docs/reactivity-api#the-signal-prop-type).

### Optional props and defaults

`Option<T>` props default to `None`. Use `#[prop(default = …)]` to give a
prop a default value so callers can omit it:

```rust
#[component]
fn avatar(url: Signal<String>, #[prop(default = 40)] size: i32) -> Element {
    // `size` is optional; defaults to 40
    render! { /* … */ }
}
```

> A **missing required prop** is reported when the component mounts, not
> at compile time. This keeps editor autocompletion clean inside
> `render!`; the trade-off is that forgetting a required prop surfaces at
> runtime with a clear message.

## Children

Give a component a `children: Children` prop to accept nested content,
then call `children()` where it should appear:

```rust
#[component]
fn card(children: Children) -> Element {
    render! {
        view(class: "card") {
            children()
        }
    }
}

// Usage:
render! {
    Card {
        text(value: "Inside the card")
    }
}
```

## What's next

- Style your views in [Styling with CSS](/docs/styling).
- Make them reactive in [State Management](/docs/state-management).
- Render lists and conditionals in
  [Lists & Conditionals](/docs/lists-and-conditionals).
