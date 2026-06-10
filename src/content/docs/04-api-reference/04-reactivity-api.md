---
title: Reactivity
description: Signals, computed values, effects, resources, context, and scopes.
order: 4
---

# API Reference: Reactivity

Whisker's reactivity is Solid/Leptos-shaped: **signals** hold state,
**computed** values derive from them, and **effects** run side effects
when their dependencies change. Reads register dependencies; writes
notify subscribers. Everything here comes through the prelude.

```rust
use whisker::prelude::*;
```

## The single tracking rule

Reading a signal **inside a tracking context** — an `effect`, a
`computed`, or a reactive prop in `render!` — subscribes that context to
the signal. Reading via `.get()` at a non-reactive call site (outside any
effect/computed) just returns the current value and subscribes to
nothing. This is the whole model:

```rust
let (count, set_count) = signal(0);

effect(move || println!("count is {}", count.get())); // subscribes
let now = count.get_untracked();                       // never subscribes
```

Use the `_untracked` variants when you want to read a value inside an
effect without making it a dependency.

## `signal`

```rust
let (count, set_count) = signal(0_i32);
```

`signal(initial) -> (ReadSignal<T>, WriteSignal<T>)` allocates a new
signal in the current [owner](#owners-advanced) and splits read and
write capability into two handles. Both handles are `Copy`, so they move
freely into `move ||` closures. A child can be handed `count:
ReadSignal<i32>` with no ability to write.

### `ReadSignal<T>`

| Method | Signature | Notes |
|---|---|---|
| `get` | `(self) -> T` | Read + subscribe. Requires `T: Clone`. |
| `get_untracked` | `(self) -> T` | Read without subscribing. Requires `T: Clone`. |
| `with` | `(self, f: impl FnOnce(&T) -> R) -> R` | Borrowed read + subscribe. No `Clone` bound. |
| `with_untracked` | `(self, f: impl FnOnce(&T) -> R) -> R` | Borrowed read, no subscribe. |

Use `with` / `with_untracked` when `T` is expensive to clone or isn't
`Clone`.

### `WriteSignal<T>`

| Method | Signature | Notes |
|---|---|---|
| `set` | `(self, value: T)` | Replace the value, notify subscribers. |
| `update` | `(self, f: impl FnOnce(&mut T))` | Mutate in place, notify subscribers. |
| `update_untracked` | `(self, f: impl FnOnce(&mut T))` | Mutate without notifying. Escape hatch — use sparingly. |

```rust
set_count.set(1);
set_count.update(|n| *n += 1);
```

> Writes enqueue subscriber notifications rather than running them
> synchronously, to support batched event-handler semantics. The runtime
> drains them each tick; see [`flush`](#owners-advanced) for the manual
> drain.

## `RwSignal<T>`

A combined read-write handle — equivalent to holding both a
`ReadSignal<T>` and a `WriteSignal<T>` for the same node. `Copy`.

```rust
let count = RwSignal::new(0_i32);
count.set(1);
count.update(|n| *n += 1);
let n = count.get();
```

| Method | Signature | Notes |
|---|---|---|
| `new` | `(initial: T) -> Self` | Allocate in the current owner. |
| `read_only` | `(self) -> ReadSignal<T>` | Project to a read handle on the same value. |
| `split` | `(self) -> (ReadSignal<T>, WriteSignal<T>)` | Split into the two halves. |
| `get` | `(self) -> T` | Read + subscribe. `T: Clone`. |
| `get_untracked` | `(self) -> T` | Read, no subscribe. `T: Clone`. |
| `with` | `(self, f) -> R` | Borrowed read + subscribe. |
| `with_untracked` | `(self, f) -> R` | Borrowed read, no subscribe. |
| `set` | `(self, value: T)` | Replace + notify. Panics if disposed. |
| `update` | `(self, f)` | Mutate + notify. Panics if disposed. |
| `update_untracked` | `(self, f)` | Mutate, no notify. |
| `try_set` | `(self, value: T) -> bool` | Like `set`, returns `false` if the signal was already disposed. |
| `try_update` | `(self, f) -> bool` | Like `update`, returns `false` if disposed. |

`try_set` / `try_update` exist for callers that legitimately race owner
disposal (e.g. a write from an `on_cleanup` callback that may fire after
the signal's owner has freed its nodes). They never panic on a disposed
signal.

## Arc signals — `arc_signal` & the `Arc*` family

The signal handles above are **arena-owned**: their lifetime is bounded
by the [owner](#owners-advanced) that allocated them, and they're freed
automatically when the component unmounts. That's the right default for
component-local state.

The `Arc*` family is **reference-counted** instead: an Arc signal owns
its value through an `Rc` and stays alive as long as any handle on it
remains, regardless of owner disposal. Reach for it when a signal must
**outlive its declaring scope** — process-global state stashed in a
`static`/`OnceLock`, state shared across components whose lifecycles
don't nest (stack-navigator routes, independently-mounted tabs, portaled
modals), or `HashMap<K, ArcRwSignal<V>>` collections.

```rust
let (count, set_count) = arc_signal(0_i32);
set_count.set(1);
assert_eq!(count.get(), 1);
```

| Type | Role | Cloneability |
|---|---|---|
| `ArcRwSignal<T>` | Combined read/write | `Clone` (Rc bump), **not** `Copy` |
| `ArcReadSignal<T>` | Read-only projection | `Clone`, not `Copy` |
| `ArcWriteSignal<T>` | Write-only projection | `Clone`, not `Copy` |

`arc_signal(initial) -> (ArcReadSignal<T>, ArcWriteSignal<T>)` is the Arc
analog of [`signal`](#signal). `ArcRwSignal::new`, `read_only`,
`write_only`, `split`, `get`/`get_untracked`, `with`/`with_untracked`,
`set`, `update`, `update_untracked` mirror the arena types' method shape
exactly — the only difference is that you clone these handles explicitly
(they aren't `Copy`).

Whisker also provides `From<ArcRwSignal<T>> for RwSignal<T>` (and the
read/write analogs), so a module author can stash an `ArcRwSignal` at the
storage boundary and hand out a `Copy` arena handle at the API surface.

## `computed`

```rust
let (count, _set) = signal(0_i32);
let doubled = computed(move || count.get() * 2);
assert_eq!(doubled.get(), 0);
```

`computed(f) -> ReadSignal<T>` (where `T: Clone + PartialEq`) creates a
derived, **memoised** value — "an effect that caches its return value".
The closure re-runs when a tracked source changes, and subscribers are
only notified when the recomputed value **differs** from the cached one,
so a computed whose result is unchanged costs nothing downstream.

The returned handle is a plain `ReadSignal<T>` — read it with
`.get()` / `.with()` exactly like a primitive signal. Internally `f`
runs once (untracked) to seed the cache, then once more to register its
dependency graph.

## `effect`

```rust
let (count, _set) = signal(0_i32);
effect(move || {
    println!("count changed to {}", count.get());
});
```

`effect(f)` registers a reactive side effect. It runs **once
immediately** (recording every signal it reads as a dependency) and
re-runs whenever any dependency changes. The first run is synchronous —
the effect has already executed by the time `effect` returns. Later runs
are scheduled and drained at flush time.

## Context

Pass values down the owner tree without threading props.
`provide_context::<T>(value)` stores a value in the current owner;
lookups walk up the owner chain to the nearest provider.

| Function | Signature | Notes |
|---|---|---|
| `provide_context` | `(value: T)` | Store a `T` in the current owner. Re-providing the same `T` replaces it. |
| `use_context` | `() -> Option<T>` | Nearest provided `T`, cloned. `T: Clone`. |
| `with_context` | `(f: impl FnOnce(&T) -> R) -> Option<R>` | Borrow the nearest `T` without cloning. |

```rust
#[derive(Clone)]
struct Theme { dark: bool }

provide_context(Theme { dark: true });

// in a descendant:
let theme = use_context::<Theme>().expect("Theme provided above");
```

Use `with_context` when `T` is expensive to clone or you only need a
borrow.

## Async data — `resource`

A resource runs an async fetcher and exposes its loading / ready / error
state through a `Copy` handle. See [Tasks & Threading](/docs/tasks) for
`spawn_local` and `run_blocking`, which resources build on.

```rust
let stories = resource(|| async {
    run_blocking(|| {
        ureq::get("https://example.com/feed.json")
            .call()
            .map_err(|e| e.to_string())?
            .into_string()
            .map_err(|e| e.to_string())
    })
    .await
    .and_then(|body| parse(&body))
});
```

| Function | Signature | Notes |
|---|---|---|
| `resource` | `(fetcher) -> Resource<T>` | Spawns the fetcher on the task pool. Returns immediately in `Loading`. |
| `resource_sync` | `(fetcher) -> Resource<T>` | Runs the fetcher inline (no worker thread). Resolves to `Ready`/`Error` immediately, never `Loading`. |

The `fetcher` returns `Result<T, String>` — by convention you stringify
upstream errors with `.map_err(|e| e.to_string())`.

### `Resource<T>`

`Copy`. Requires `T: Clone`.

| Method | Signature | Notes |
|---|---|---|
| `get` | `(&self) -> Option<T>` | `Some(value)` when ready, else `None`. |
| `loading` | `(&self) -> bool` | `true` while the fetch is in flight. |
| `error` | `(&self) -> Option<String>` | `Some(message)` if the fetch failed. |
| `state` | `(&self) -> ResourceState<T>` | The full state (reactive read). |
| `from_state` | `(state: RwSignal<ResourceState<T>>) -> Self` | Build a synthetic resource from an existing signal. |

All accessors read the underlying signal reactively — calling them inside
a `render!` prop or an effect re-renders on state transitions.

### `ResourceState<T>`

```rust
pub enum ResourceState<T> {
    Loading,
    Ready(T),
    Error(String),
}
```

| Method | Returns | True when |
|---|---|---|
| `is_loading` | `bool` | state is `Loading` |
| `is_ready` | `bool` | state is `Ready(_)` |
| `is_error` | `bool` | state is `Error(_)` |

## `StoredValue<T>`

`Copy` owner-bound storage that does **not** participate in reactivity —
reads don't subscribe and writes don't notify. It's the scoped
equivalent of `Rc<RefCell<...>>`: share non-reactive state across
closures in a component and have it freed automatically on unmount.

| Method | Signature | Notes |
|---|---|---|
| `new` | `(initial: T) -> Self` | Allocate in the current owner. |
| `get` | `(self) -> T` | Read (no subscribe). `T: Clone`. |
| `with` | `(self, f: impl FnOnce(&T) -> R) -> R` | Borrowed read. |
| `update` | `(self, f: impl FnOnce(&mut T) -> R) -> R` | Borrowed mutation (no notify). |
| `set` | `(self, value: T)` | Replace the value. |

## The Signal prop type

> Reachable at `/docs/reactivity-api#the-signal-prop-type`.

`Signal<T>` is the **prop value type** used by `#[component]`,
built-in tags, and `#[whisker::module_component]` builders. It encodes
"this prop accepts either a plain value **or** a reactive signal":

```rust
pub enum Signal<T> {
    Static(T),              // plain value — set once
    Dynamic(ReadSignal<T>), // reactive handle — tracked, updates live
}
```

A builder method takes `impl Into<Signal<T>>`, so the call-site
conversion is implicit. Passing a `T` yields `Static`; passing a
`ReadSignal`, `RwSignal`, or the `ReadSignal` returned by
[`computed`](#computed) yields `Dynamic`. A `&str` literal converts to
`Signal::Static(String)`.

| `From` impl | Produces |
|---|---|
| `From<T>` | `Signal::Static(value)` |
| `From<ReadSignal<T>>` | `Signal::Dynamic` |
| `From<RwSignal<T>>` | `Signal::Dynamic` (via `read_only()`) |
| `From<&str>` for `Signal<String>` | `Signal::Static(String)` |

Read a `Signal<T>` prop with `.get()`:

- `Static` returns a clone of the held value — no reactivity.
- `Dynamic` forwards to `ReadSignal::get`, which **subscribes** the
  current tracking context.

```rust
#[component]
fn badge(label: Signal<String>) -> Element {
    let style = computed(move || format!("content: {}", label.get()));
    render! { view(style: style) { text(value: label) } }
}

// static prop:
render! { Badge(label: "items") }
// reactive prop:
render! { Badge(label: my_signal) }
```

This is exactly the [static-vs-dynamic distinction](/docs/macros) the
`render!` macro surfaces: pass a signal handle for reactivity, or
pre-read it with `signal.get()` to capture a one-shot static snapshot.

## Owners (advanced)

> Framework-extension surface. Application code almost never touches
> these directly — `#[component]`, `provide_context`, `on_cleanup`, and
> friends set up and tear down owners for you. Reach here when authoring
> custom control flow, a router, or a custom renderer. Available via
> `whisker::runtime::owner` / `whisker::owner`.

An `Owner` is a reactive **scope**: the lifetime unit that ties together
signals, effects, computeds, element handles, and cleanup callbacks.
Disposing an owner cascades into its children, frees every node it
allocated, releases its element handles, and runs its cleanup callbacks
in LIFO order.

| Method | Signature | Notes |
|---|---|---|
| `Owner::new` | `(parent: Option<Owner>) -> Owner` | `None` ⇒ child of the current owner. Inherits the parent's paused flag. |
| `with` | `(self, f: impl FnOnce() -> R) -> R` | Run `f` with `self` as the current scope; primitives allocated inside belong to it. |
| `dispose` | `(self)` | Tear down the scope and all descendants. Idempotent. |
| `pause` | `(self)` | Freeze the subtree — scheduled effects defer instead of running. |
| `resume` | `(self)` | Unfreeze and re-queue deferred effects. |
| `is_paused` | `(self) -> bool` | Mainly for tests. |

`pause` / `resume` back off-screen-but-mounted UI (e.g. back-stack
routes) — state survives but no CPU is spent on signal-driven re-renders
behind the top route.

### Lifecycle free functions

| Function | Signature | Notes |
|---|---|---|
| `on_mount` | `(f: impl FnOnce() + 'static)` | Fires once after the component's view is appended to the tree. |
| `on_cleanup` | `(f: impl FnOnce() + 'static)` | Runs when the current owner is disposed. Accumulates LIFO. |
| `flush` | `()` | Drain the pending queue, re-running scheduled effects/computeds now. No-op if a flush is already in progress. |

`on_mount` is the right place for post-mount measurement or kicking off
background work; `on_cleanup` for releasing resources. `flush` is rarely
needed in app code — the runtime drains every tick — but is essential in
tests and custom drivers to force pending effects to run.
