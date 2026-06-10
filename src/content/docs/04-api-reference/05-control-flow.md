---
title: Control Flow
description: Conditional rendering and keyed lists in render!.
order: 5
---

# API Reference: Control Flow

Conditional rendering and dynamic lists are not special syntax in
Whisker. `Show` and `ForEach` are ordinary [`#[component]`](/docs/macros)
functions you call inside [`render!`](/docs/macros) like any other
component. Both are brought in by the prelude:

```rust
use whisker::prelude::*;
```

Each allocates an invisible fragment and installs a reactive
[`effect`](/docs/reactivity-api) that mounts and unmounts children as
their reactive source changes. The fragment has no on-screen footprint,
so the rendered tree stays wrapper-less.

## `Show`

Conditional rendering. When the `when` predicate reads `true`, the
`children` are mounted; when it reads `false`, the optional `fallback`
is mounted instead. The predicate is reactive — it re-evaluates whenever
a signal it reads changes, and on every flip the previously-mounted
branch's owner is disposed before the other branch is created, so
reactive state from the old branch cannot leak.

```rust
#[component]
fn Toggle() -> Element {
    let open = signal(false);

    render! {
        view {
            view(on_tap: move |_| open.set(!open.get())) {
                text(value: "toggle")
            }
            Show(
                when: move || open.get(),
                fallback: move || render! { text(value: "(hidden)") },
            ) {
                text(value: "now you see me")
            }
        }
    }
}
```

### `ShowProps`

| Prop | Type | Required | Role |
|---|---|---|---|
| `when` | [`WhenFn`](#function-wrapper-prop-types) | yes | Reactive `move \|\| bool` predicate. |
| `children` | [`Children`](#function-wrapper-prop-types) | yes | Mounted when `when` is `true`. |
| `fallback` | [`Fallback`](#function-wrapper-prop-types) | no (default empty) | Mounted when `when` is `false`; renders nothing when omitted. |

## `ForEach`

A keyed list. `each` is the reactive items source; on every change the
effect recomputes it, derives a key per item via `key`, and diffs
against the previous frame:

- **kept** (same key) → the existing element and its per-item owner are
  preserved, so any reactive state inside survives;
- **new** key → a fresh owner is created and `children(item)` runs;
- **missing** key → that item's owner is disposed and its element
  detached.

```rust
#[component]
fn TodoList(todos: Signal<Vec<Todo>>) -> Element {
    render! {
        view {
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

### Why keying matters

The `key` must be stable and unique per item. Diffing by key (rather
than by position) is what lets `ForEach` recognize that an item moved,
was inserted, or was removed — instead of tearing down and rebuilding
every row. Survivors keep their element and their reactive state across
reorders; only genuinely new keys instantiate fresh children. A poor key
(e.g. the list index) defeats this and reattaches state to the wrong
item.

`ForEach` is **not virtualized** — every item is materialized into the
tree. For large or scrolling collections, use the
[`list`](/docs/elements) built-in tag, which renders items on demand.

### `ForEachProps`

| Prop | Type | Required | Role |
|---|---|---|---|
| `each` | [`EachFn<T>`](#function-wrapper-prop-types) | yes | Reactive `move \|\| Vec<T>` items source. |
| `key` | [`KeyFn<T, K>`](#function-wrapper-prop-types) | yes | `\|item: &T\| -> K`; `K: Eq + Hash + Clone`. |
| `children` | [`ItemFn<T>`](#function-wrapper-prop-types) | yes | `\|item: T\| -> Element`; renders one item. |

## Function-wrapper prop types

These newtypes wrap the closures the props accept. Each has a blanket
`From<closure>` impl, so you almost always pass a plain closure and let
inference fill the type in — you rarely name them.

| Type | Used by | Wraps |
|---|---|---|
| `WhenFn` | `Show.when` | `Fn() -> bool` |
| `Children` | `Show.children` (and `#[component]` `children`) | `Fn() -> View` |
| `Fallback` | `Show.fallback` | `Option<Fn() -> Element>` (`None` = empty) |
| `EachFn<T>` | `ForEach.each` | `Fn() -> Vec<T>` |
| `KeyFn<T, K>` | `ForEach.key` | `Fn(&T) -> K` |
| `ItemFn<T>` | `ForEach.children` | `Fn(T) -> Element` |

> Because `Show` and `ForEach` are plain `#[component]`s, the
> `render!` macro lowers each call to `ShowProps::builder()…build()` /
> `ForEachProps::builder()…build()`, exactly as for your own components.
> See [Macros](/docs/macros) for the builder lowering, and
> [Reactivity](/docs/reactivity-api) for how the predicate and items
> source re-run.
