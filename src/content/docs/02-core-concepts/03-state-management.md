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

There are two ways to make a signal, and they're equivalent — pick by
ergonomics.

A unified read/write handle:

```rust
use whisker::prelude::*;

let count = RwSignal::new(0);
count.get();            // 0  — read
count.set(7);           // replace
count.update(|n| *n += 1); // mutate in place → 8
```

Or a Solid-style split into separate read and write halves:

```rust
use whisker::prelude::*;

let (count, set_count) = signal(0);
count.get();            // 0
set_count.set(7);
set_count.update(|n| *n += 1);
```

`signal(v)` returns `(ReadSignal<T>, WriteSignal<T>)`. The split is
useful when you want to hand a child component the ability to *read*
state without also handing it the ability to *write*. You can always go
back and forth with `count.split()` / `rw.read_only()`.

All of these handles are `Copy`, so they move into `move |_|` closures
freely — copying a handle does **not** clone the underlying value; both
copies point at the same slot.

`set` replaces the value; `update` hands you `&mut T` to mutate in place,
which is what you want for collections (`update(|v| v.push(item))`) and
for types that aren't `Clone`. Full method tables live in the
[Reactivity reference](/docs/reactivity-api).

## The one rule, made concrete

Here is the whole model in one example:

```rust
use whisker::prelude::*;

let count = RwSignal::new(0);

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

let count = RwSignal::new(0);
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

let name = RwSignal::new("world".to_string());

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
fn Counter() -> Element {
    let count = RwSignal::new(0);
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

## `RwSignal` vs the `signal()` split

Use whichever reads best:

- **`RwSignal::new(v)`** when the same place both reads and writes — most
  component-local state. One `Copy` handle to carry around.
- **`signal()` → `(read, write)`** when you want to *separate*
  capabilities — e.g. give a child a `ReadSignal<T>` so it can display
  state but not mutate it, while the parent keeps the `WriteSignal<T>`.

To share writable state with a child, lift the signal to the common
parent and pass the handle down as a prop:

```rust
use whisker::prelude::*;

#[component]
fn Parent() -> Element {
    let count = RwSignal::new(0);
    render! {
        view {
            Display(count: count)
            Controls(count: count)
        }
    }
}
```

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
