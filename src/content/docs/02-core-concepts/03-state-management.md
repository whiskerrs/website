---
title: State Management
description: Hold and derive state with signals.
order: 3
---

# State Management

A Whisker component function runs **once**, when it mounts. There is no
re-render of the whole function when state changes. So how does the UI
update? Through **signals**: reactive values that remember who reads
them and notify exactly those readers when they change.

This is the single idea to internalize:

> **Reading a signal inside a view (or an effect/computed) subscribes
> that one spot to the signal. Writing the signal re-runs only the spots
> that read it** — a text node, a style attribute, a derived value — and
> nothing else.

No virtual DOM, no diffing, no component re-execution. Just targeted
updates at the precise places that depend on the value.

## Creating state

Make a signal with `signal(v)`. It hands back a single read/write handle
— an `RwSignal<T>` — that both reads and writes the same slot:

```rust
use whisker::prelude::*;

let count = signal(0);
count.get();               // 0  — read
count.set(7);              // replace
count.update(|n| *n += 1); // mutate in place → 8
```

`signal(initial)` returns `RwSignal<T>`. `RwSignal::new(initial)` is the
equivalent explicit constructor — `signal(0)` is just the idiomatic
shorthand:

```rust
let count = signal(0);        // idiomatic
let count = RwSignal::new(0); // identical
```

The handle is `Copy`, so it moves into `move |_|` closures freely —
copying a handle does **not** clone the underlying value; both copies
point at the same slot.

You **read** with `.get()` (returns a clone, subscribes the current
tracking context) or `.with(|v| …)` (borrows the value, no `Clone`
bound). You **write** with `.set(v)` (replace) or `.update(|v| …)`
(mutate in place — what you want for collections like
`update(|v| v.push(item))` and for types that aren't `Clone`).

There is **no call sugar**: a signal is read and written through these
methods, never by calling it. Write `count.get()` and `count.set(1)`,
not `count()` or `count(1)`. Full method tables live in the
[Reactivity reference](/docs/reactivity-api).

## The one rule, made concrete

Here is the whole model in one example:

```rust
use whisker::prelude::*;

let count = signal(0);

render! {
    view {
        // `count.get()` reads the signal here, so this text node
        // subscribes. When count changes, ONLY this text updates.
        text { "Count: " {count.get()} }

        view(on_tap: move |_| count.update(|n| *n += 1)) {
            text(value: "+1")
        }
    }
}
```

Tapping `+1` runs the handler, which mutates `count`. The runtime then
re-runs only the text interpolation that read `count` — not the whole
component, not the sibling views. That is fine-grained reactivity.

## Deriving values with `computed`

When you need a value that depends on other state, don't recompute it by
hand — derive it with `computed`. The closure re-runs whenever a signal
it reads changes, and the result is cached:

```rust
use whisker::prelude::*;

let count = signal(0);
let label = computed(move || format!("You clicked {} times", count.get()));

render! {
    text(value: label)   // updates whenever count changes
}
```

`computed(f)` returns a `ReadSignal<T>` — the *same* type a plain signal
hands out — so you read it with `.get()` just like any other signal, and
you can pass it anywhere a reactive value is accepted.

Computed values are **memoized**: subscribers are only notified when the
new result actually differs from the previous one (`T: PartialEq`). A
computed whose inputs change but whose output stays the same costs
nothing downstream. See
[`computed`](/docs/reactivity-api#computed) for details.

## How signals flow into `render!`

This is the most important everyday rule, and it's visible right at the
call site:

- **Pass a signal handle → reactive.** The attribute or prop tracks the
  signal and updates live.
- **Pass `.get()` or a plain value → a static snapshot.** The value is
  read once, at the call site, and never updates.

```rust
use whisker::prelude::*;

let name = signal("world".to_string());

render! {
    text(value: name)        // reactive — re-renders when `name` changes
    text(value: name.get())  // snapshot — captures the value once
    text(value: "literal")   // static — never changes
}
```

The same rule applies to your own `#[component]` props. A prop typed
`Signal<T>` accepts *either* a plain value or a signal handle, and
chooses static-vs-reactive based on what you pass. This is
[The Signal prop type](/docs/reactivity-api#the-signal-prop-type), and
it's why `Badge(label: "items")` and `Badge(label: my_signal)` are both
valid calls to the same component.

## A worked example: counter with a derived label

Putting it together — a counter, a derived parity label, and a button:

```rust
use whisker::prelude::*;

#[component]
fn counter() -> Element {
    let count = signal(0);
    let parity = computed(move || {
        if count.get() % 2 == 0 { "even" } else { "odd" }
    });

    render! {
        view {
            text { "Count: " {count.get()} " (" {parity.get()} ")" }
            view(on_tap: move |_| count.update(|n| *n += 1)) {
                text(value: "Increment")
            }
        }
    }
}
```

`count` is the source of truth. `parity` derives from it and only
notifies its reader when the even/odd result flips. The button's handler
is the only writer. Three independent reactive spots, one signal — no
manual wiring.

## Splitting read/write

An `RwSignal` carries both capabilities, but you don't always want to
hand both to everyone. When you pass state into a child component, you
usually want to grant exactly one capability — a child that *displays*
state shouldn't be able to *mutate* it, and vice versa. The `RwSignal`
projects into narrower handles:

- **`count.read_only()` → `ReadSignal<T>`** — a read-only view of the
  same slot. Pass this to a child that should only display the value.
- **`count.write_only()` → `WriteSignal<T>`** — a write-only handle. Pass
  this to a child whose only job is to mutate.
- **`count.split()` → `(ReadSignal<T>, WriteSignal<T>)`** — both halves at
  once, the Solid-style pair. Handy when one site reads and a different
  site writes.

All three project onto the **same underlying slot** — they don't copy the
value — and like `RwSignal` they're `Copy`, so they move into closures
freely.

The recommended pattern for sharing state with a child is to keep the
`RwSignal` in the parent and pass down the narrowest handle the child
needs:

```rust
use whisker::prelude::*;

#[component]
fn parent() -> Element {
    let count = signal(0);
    render! {
        view {
            // `Display` only reads → hand it a read-only handle.
            Display(count: count.read_only())
            // `Controls` both reads and writes → hand it the RwSignal.
            Controls(count: count)
        }
    }
}
```

If you prefer the explicit pair up front, destructure with `.split()`:

```rust
use whisker::prelude::*;

let (count, set_count) = signal(0).split();
count.get();               // ReadSignal — read only
set_count.set(7);          // WriteSignal — write only
set_count.update(|n| *n += 1);
```

This is the only place you'll see the `(read, write)` tuple form — it's a
deliberate split, not the default way to create a signal.

## When state must outlive its owner: `Arc*` signals

Arena signals (`RwSignal`, `ReadSignal`, `WriteSignal`) are tied to the
[owner](/docs/reactivity#ownership-and-cleanup) that created them and are
freed automatically when that component unmounts. That's the right
default.

When a signal must **outlive** its declaring scope — process-global
state in a `static`/`OnceLock`, state shared across independently-mounted
screens, or a `HashMap<K, ArcRwSignal<V>>` — reach for the
reference-counted `Arc*` family instead. They stay alive as long as any
handle remains, and they mirror the arena types' method shape (they're
`Clone` rather than `Copy`). See
[Arc signals](/docs/reactivity-api#arc-signals--arc_signal--the-arc-family).

## Non-reactive storage: `StoredValue`

Not everything needs to be reactive. If you want owner-scoped storage
that's freed on unmount but does **not** subscribe on read or notify on
write — the scoped equivalent of `Rc<RefCell<…>>` — use
[`StoredValue`](/docs/reactivity-api#storedvaluet):

```rust
use whisker::prelude::*;

let history = StoredValue::new(Vec::<String>::new());
history.update(|h| h.push("event".to_string()));
```

And if a value is decided once at mount and never changes, skip signals
entirely and use a plain Rust binding — there's no reason to pay for
reactive bookkeeping a constant doesn't need.

## What's next

- Go deeper into effects, batching, and ownership in
  [Reactivity in Depth](/docs/reactivity).
- Render reactive lists and conditionals in
  [Lists & Conditionals](/docs/lists-and-conditionals).
- Wire up taps and other events in
  [Handling Events](/docs/handling-events).
