---
title: Lists & Conditionals
description: Render conditionally with Show and keyed lists with ForEach.
order: 5
---

# Lists & Conditionals

Control flow inside `render!` isn't special syntax — `Show` and `ForEach`
are ordinary components you call like any other. Both come from the prelude:

```rust
use whisker::prelude::*;
```

Each installs a reactive effect that mounts and unmounts children as its
source changes, with no wrapper element in the rendered tree.

## Conditional rendering with `Show`

`Show` mounts its children while the `when` predicate reads `true`, and an
optional `fallback` while it reads `false`. The predicate is a reactive
closure — `move || …` that reads a signal — so the branch flips
automatically when that signal changes:

```rust
use whisker::prelude::*;

#[component]
fn Greeting() -> Element {
    let signed_in = signal(false);

    render! {
        view(style: css!(display: flex, flex_direction: column, gap: 8.px())) {
            view(on_tap: move |_| signed_in.set(!signed_in.get())) {
                text(value: "toggle")
            }
            Show(
                when: move || signed_in.get(),
                fallback: move || render! { text(value: "Please sign in") },
            ) {
                text(value: "Welcome back!")
            }
        }
    }
}
```

When omitted, `fallback` renders nothing. On every flip the old branch is
fully disposed before the new one mounts, so reactive state from the hidden
branch can't leak.

## Keyed lists with `ForEach`

`ForEach` renders one element per item in a `Vec`. It takes three props:

- `each` — a reactive `move || Vec<T>` items source,
- `key` — `|item: &T| -> K` deriving a stable key, and
- `children` — `|item: T| -> Element` rendering one row.

```rust
use whisker::prelude::*;

#[derive(Clone)]
struct Todo { id: u32, title: String }

#[component]
fn TodoList(todos: Signal<Vec<Todo>>) -> Element {
    render! {
        view(style: css!(display: flex, flex_direction: column, gap: 4.px())) {
            ForEach(
                each: move || todos.get(),
                key: |todo: &Todo| todo.id,
                children: |todo: Todo| render! {
                    text(value: todo.title)
                },
            )
        }
    }
}
```

### Why keys matter

`ForEach` diffs the new list against the previous frame **by key**, not by
position. That's what lets it tell that an item moved, was inserted, or was
removed:

- a **kept** key reuses the existing element and its per-item state, so
  anything reactive inside a row survives a reorder;
- a **new** key creates a fresh row;
- a **missing** key disposes that row.

So the key must be stable and unique per item — a database id is ideal.
Using the list index as a key defeats this: when the list reorders, state
ends up attached to the wrong item.

## When to reach for `list` instead

`ForEach` materializes **every** item into the tree, which is fine for
short lists. For large or scrolling collections, use the virtualized
[`list`](/docs/elements) built-in tag, which renders items on demand as
they scroll into view.

## Combining them: a list with an empty state

`Show` and `ForEach` compose. Here a `Show` renders an empty-state message
when the list is empty, and the `ForEach` renders the rows otherwise:

```rust
use whisker::prelude::*;

#[derive(Clone)]
struct Todo { id: u32, title: String }

#[component]
fn Todos(todos: Signal<Vec<Todo>>) -> Element {
    render! {
        view(style: css!(display: flex, flex_direction: column, gap: 4.px())) {
            Show(
                when: move || todos.get().is_empty(),
            ) {
                text(value: "Nothing to do yet")
            }
            ForEach(
                each: move || todos.get(),
                key: |t: &Todo| t.id,
                children: |t: Todo| render! { text(value: t.title) },
            )
        }
    }
}
```

Run it with `whisker run ios`.

## What's next

- Exact prop types for `Show` and `ForEach` are in the
  [Control Flow reference](/docs/control-flow).
- The virtualized `list` tag is in the [Elements reference](/docs/elements).
- Drive these sources from state in [State Management](/docs/state-management).
