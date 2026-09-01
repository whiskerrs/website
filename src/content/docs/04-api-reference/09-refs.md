---
title: Imperative Handles
description: Bind mounted elements and send ordered one-way commands.
order: 9
---

# API Reference: Imperative Handles

Use declarative props for persistent state. Use a handle only for an operation
whose meaning is inherently imperative, such as scrolling an already-mounted
container.

## Binding

Create a typed handle and pass its internal ref to `element_ref`:

```rust
let scroller = ScrollViewHandle::new();

render! {
    ScrollView(element_ref: scroller.r()) {
        // content
    }
}
```

Handles are cheap and `Copy`, so they can be captured by event closures.

## Built-in handles

| Handle             | Operations                                               |
| ------------------ | -------------------------------------------------------- |
| `ElementHandle`    | Binding for a generic element                            |
| `ScrollViewHandle` | `scroll_to(offset, smooth)`, `scroll_by(offset, smooth)` |
| `TextHandle`       | Binding for text-specific integrations                   |
| `ListHandle<K>`    | Virtual-list snapshot and keyed scrolling operations     |

```rust
let scroller = ScrollViewHandle::new();

render! {
    View(on_tap: move |_| scroller.scroll_to(0.0, true)) {
        Text(value: "Back to top")
    }
    ScrollView(element_ref: scroller.r()) {
        // content
    }
}
```

Calling a typed method while the element is not mounted is a no-op for the
built-in convenience handles.

## Module element commands

Module authors use the lower-level `ElementRef::command` to enqueue a command
declared by `#[whisker::module_element]`:

```rust
let result = element_ref.command(
    "setCamera",
    WhiskerValue::map([("zoom", WhiskerValue::Float(12.0))]),
);
```

The parameters are always one `WhiskerValue`. The command is schema-validated,
ordered with frame operations, and one-way. `Ok(())` means it was enqueued; it
does not contain a synchronous Host return value. Use a function-shaped module
when a result is required.

`ElementRef::is_bound()` is an untracked check. `ElementRef::bound()` returns a
reactive signal suitable for an `effect`.

## Lifetime

The runtime binds the ref after mount and clears it on unmount. A command sent
before mount or after unmount returns `RefError::NotBound`; a rejected Host
dispatch returns `RefError::DispatchFailed`.
