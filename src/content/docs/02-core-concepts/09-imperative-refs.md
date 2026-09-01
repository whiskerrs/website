---
title: Imperative Handles
description: Reach a mounted element when a declarative prop is not enough.
order: 9
---

# Imperative Handles

Persistent UI state should remain declarative. A small set of actions instead
target an already-mounted Host element: scroll now, focus now, or send a
module-specific command. Handles provide that escape hatch without exposing a
Host object to application code.

```rust
use whisker::prelude::*;

#[whisker::component]
fn Page() -> Element {
    let scroller = ScrollViewHandle::new();

    render! {
        View(on_tap: move |_| scroller.scroll_to(0.0, true)) {
            Text(value: "Top")
        }
        ScrollView(element_ref: scroller.r()) {
            // long content
        }
    }
}
```

The handle becomes bound when the element mounts and is cleared when it
unmounts. It can be copied into multiple closures. Built-in typed handles hide
the raw command name and payload.

Module authors can wrap `ElementRef::command(name, WhiskerValue)` in their own
typed handle. Commands are ordered, one-way operations in the frame protocol;
use a platform module function when the caller needs a return value.

See [Imperative Handles](/docs/refs) for the built-in handle list and error
semantics.
