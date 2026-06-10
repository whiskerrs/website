---
title: Context
description: Pass values down the tree without prop drilling.
order: 7
---

# Context

Some values are needed all over the tree: the current theme, the
logged-in user, an app-wide store, the router's navigation stack.
Threading those through every component as props — *prop drilling* —
gets tedious fast, and every intermediate component has to forward a prop
it doesn't even use. **Context** lets an ancestor publish a value that any
descendant can read directly.

## Providing and consuming

Call `provide_context(value)` in an ancestor to make a value available to
everything below it. A descendant reads it with `use_context::<T>()`,
which returns the nearest provided value of that type:

```rust
use whisker::prelude::*;

#[derive(Clone)]
struct Theme {
    dark: bool,
}

#[whisker::main]
fn app() -> Element {
    // Publish at the root...
    provide_context(Theme { dark: true });

    render! {
        page {
            Toolbar()
        }
    }
}

#[component]
fn Toolbar() -> Element {
    // ...read it anywhere below, no props in between.
    let theme = use_context::<Theme>().expect("Theme provided at root");
    let bg = if theme.dark { "#111" } else { "#fff" };

    render! {
        view(style: format!("background: {bg};")) {
            text(value: "Toolbar")
        }
    }
}
```

`use_context::<T>()` returns `Option<T>` — it's `Some` when an ancestor
provided a `T`, and `None` otherwise. Provide above, and the lookup is
`Some`; the `.expect(...)` above documents the invariant and turns a
missing provider into a clear message.

## Borrowing without cloning

`use_context::<T>()` hands back a **clone** (so `T: Clone`). When `T` is
expensive to clone — or you only need to peek — use `with_context`, which
borrows the value for the duration of a closure:

```rust
let is_dark = with_context::<Theme, _>(|t| t.dark); // Option<bool>
```

`with_context::<T, _>(|v| ...)` returns `Option<R>` — `Some(result)` when
a `T` is in scope, `None` when it isn't.

## Context is keyed by type

A context is stored and looked up by its Rust type `T`. That has two
practical consequences.

First, **define a newtype per concern** rather than reusing a bare
primitive. Providing a `String` and later providing another `String`
would collide; wrapping each in its own struct keeps them distinct:

```rust
#[derive(Clone)]
struct CurrentUser(String);

#[derive(Clone)]
struct ApiBaseUrl(String);

provide_context(CurrentUser("ada".into()));
provide_context(ApiBaseUrl("https://api.example.com".into()));
```

Second, a closer descendant can **shadow** an ancestor's value by
providing the same type again. Lookups walk up from where you are and
stop at the nearest provider, so a subtree can override the theme (or any
context) just for itself:

```rust
#[component]
fn DarkSection() -> Element {
    provide_context(Theme { dark: true }); // overrides the ancestor here down

    render! {
        view { /* ...descendants see the dark theme... */ }
    }
}
```

## When to reach for it

Context fits app-wide, cross-cutting state: a theme, the current user, a
shared store, a router's back-stack. It's the same mechanism Whisker's
own [Routing](/docs/routing-api) uses under the hood to expose the
navigation stack to your screens.

For the full signatures — including how context relates to the reactive
owner tree — see the [Reactivity reference](/docs/reactivity-api#context).
