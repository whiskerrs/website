---
title: Tasks & Threading
description: Cooperative local tasks, blocking work, and runtime wakeups.
order: 11
---

# API Reference: Tasks & Threading

Whisker does not own a permanent game loop or require one global async runtime.
The Host calls a `RuntimeInstance` for short transactions on its UI event loop.
Reactive state belongs to that runtime thread.

## `spawn_local`

```rust
spawn_local(async move {
    let value = load().await;
    state.set(value);
});
```

`spawn_local` accepts a non-`Send` future and schedules it on the current
Whisker runtime. The future advances when the Host drives runtime work. Pending
work registers a wake handle, so completion can ask the Host to schedule the
next transaction.

## `run_blocking`

```rust
spawn_local(async move {
    let parsed = run_blocking(move || parse_large_file(bytes)).await;
    result.set(parsed);
});
```

`run_blocking` moves a `Send + 'static` closure to a worker thread and resolves
back on the Whisker task executor. Use it for CPU-heavy or blocking native work;
running that work directly in an event callback stalls the Host UI thread.

## `RuntimeDispatcher`

Code already running on another thread can capture
`runtime_dispatcher()` and call `post`:

```rust
let dispatcher = runtime_dispatcher().expect("inside a RuntimeInstance");

std::thread::spawn(move || {
    let value = blocking_operation();
    dispatcher.post(move || state.set(value));
});
```

`post` is instance-aware: it returns `false` after that runtime shuts down and
never sends work to another `WhiskerView` in the same process.

## Choosing an async runtime

Libraries may use Tokio, async-std, a browser future, or callbacks internally.
Keep that executor at the library or application boundary. Whisker core only
requires that the result be delivered back through its local executor or
`RuntimeDispatcher`.
