---
title: Reactivity in Depth
description: Effects, tracking, batching, and ownership.
order: 4
---

# Reactivity in Depth

[State Management](/docs/state-management) introduced the core rule:
reading a signal subscribes that spot, writing it updates only the
subscribers. This page goes deeper — for when you need to run side
effects, control exactly what subscribes, understand when updates flush,
and reason about cleanup.

The mental model holds throughout: **a component runs once**, and a
graph of signals, computed values, and effects — created during that one
run — is what makes the UI respond to change afterwards.

## Effects: reacting to change

A `computed` derives a *value*. An `effect` runs a *side effect* — the
bridge from reactive state to the outside world: logging, persistence,
animation, syncing to a native API.

```rust
use whisker::prelude::*;

let count = RwSignal::new(0);

effect(move || {
    log::info!("count is now {}", count.get());
});
```

An effect runs **once immediately** when created (this first run is
synchronous — it has executed by the time `effect` returns), recording
every signal it reads. From then on it re-runs whenever any of those
signals changes:

```rust
let count = RwSignal::new(0);

effect(move || log::info!("count = {}", count.get()));
// ^ logs "count = 0" right away

count.set(5);   // schedules the effect; it logs "count = 5"
count.set(8);   // logs "count = 8"
```

A common real use is mirroring reactive state into an imperative,
non-reactive API:

```rust
use whisker::prelude::*;

let volume = RwSignal::new(0.8_f32);

effect(move || {
    audio_engine::set_volume(volume.get());  // push to the native player
});
```

Now any code that writes `volume` automatically keeps the audio engine in
sync, with no explicit call sites to maintain. For full signatures see
[`effect`](/docs/reactivity-api#effect).

## Tracked vs untracked reads

By default, reading a signal inside an effect or computed **subscribes**
to it. Sometimes you want to read a value *without* making it a
dependency — say, to read configuration once inside an effect that
should only re-run for some other reason. That's what the `_untracked`
variants are for:

```rust
use whisker::prelude::*;

effect(move || {
    let tracked = position.get();            // re-runs when position changes
    let snapshot = config.get_untracked();   // read, but does NOT subscribe
    renderer::draw(tracked, snapshot);
});
```

The pairs are:

- `get` / `get_untracked` — clone-read the value.
- `with` / `with_untracked` — borrow the value (`|v: &T| -> R`), avoiding
  a clone for expensive or non-`Clone` types.

Use the tracked forms (`get` / `with`) for inputs the effect should react
to; reach for `_untracked` only when subscribing would cause an unwanted
re-run. Over-subscribing is the more common mistake, so the untracked
variants are a deliberate, occasional tool.

## Batching: one update wave per handler

Writing a signal does **not** run its subscribers synchronously. Writes
enqueue their subscribers, and the queue is drained at a flush boundary —
typically the end of an event handler. This means multiple writes in one
handler produce a **single** update wave:

```rust
use whisker::prelude::*;

view(on_tap: move |_| {
    set_first.set("Ada".to_string());
    set_last.set("Lovelace".to_string());
    set_dirty.set(true);
    // ↑ an effect (or computed, or {expr}) that reads two or three of
    //   these runs exactly ONCE here, when the handler returns — not
    //   once per write.
}) {
    text(value: "Update")
}
```

This is the Solid/Leptos "microtask batching" model. You almost never
have to think about it — it just means there's no glitchy intermediate
state and no redundant work. In tests or a custom driver you can force
the drain with [`flush`](/docs/reactivity-api#owners-advanced); app code
rarely needs it.

## Ownership and cleanup

Every `#[component]` runs inside a fresh **reactive scope**, called an
`Owner`. Every signal, computed, effect, and lifecycle hook you create in
the component body belongs to that scope. When the scope is **disposed**,
all of them are torn down together:

- the signals it allocated are freed,
- its effects and computeds stop running,
- and its cleanup callbacks fire.

This is what makes Whisker leak-free without manual unsubscription: state
lives exactly as long as the component that owns it.

### `on_mount` and `on_cleanup`

Two hooks bracket a component's life in the tree:

```rust
use whisker::prelude::*;

#[component]
fn timer() -> Element {
    let elapsed = RwSignal::new(0);

    on_mount(move || {
        log::info!("Timer is now on screen");
        // good place to start work that needs the view to exist
    });

    on_cleanup(move || {
        log::info!("Timer is being removed");
        // release resources, cancel subscriptions, etc.
    });

    render! {
        text { "Elapsed: " {elapsed.get()} }
    }
}
```

- `on_mount(f)` fires once, **after** the component's view has been
  attached to the tree — the right place for post-mount measurement or
  kicking off background work.
- `on_cleanup(f)` fires when the owning scope is disposed. Multiple
  registrations run in **LIFO** order (last-registered, first to run),
  which lets later setup tear itself down before earlier setup.

### When does disposal happen?

A component's scope is disposed when it's removed from the tree. The most
common triggers are the reactive control-flow primitives:

- When a [`Show`](/docs/lists-and-conditionals) condition flips, the
  branch that's no longer active has its scope disposed — its signals,
  effects, and `on_cleanup` callbacks all run.
- When an item drops out of a [`ForEach`](/docs/lists-and-conditionals)
  (its key disappears), that item's scope is disposed. Items whose keys
  survive keep their scope — and their local state — intact across
  re-renders.

```rust
use whisker::prelude::*;

let show_panel = RwSignal::new(true);

render! {
    Show(when: move || show_panel.get(), fallback: || render! { fragment() }) {
        // Signals and effects created in here are disposed the moment
        // `show_panel` becomes false, and recreated fresh if it flips back.
        ExpensivePanel()
    }
}
```

Because cleanup is tied to ownership rather than to manual bookkeeping,
"set up a subscription in `on_mount`, tear it down in `on_cleanup`" is a
reliable pattern: the framework guarantees the cleanup runs when the
component leaves the tree.

The `Owner` machinery itself is a framework-extension surface — see
[Owners](/docs/reactivity-api#owners-advanced) if you're authoring custom
control flow or a renderer; app code reaches it only through
`#[component]`, `on_cleanup`, and friends.

## What's next

- [Reactivity reference](/docs/reactivity-api) — exact signatures for
  signals, `computed`, `effect`, context, and owners.
- [Async & Data](/docs/async-and-data) — `resource` builds on this model
  to fetch data off the reactive graph and feed it back through signals.
- [Lists & Conditionals](/docs/lists-and-conditionals) — `Show` and
  `ForEach`, the primitives whose disposal behavior is described above.
