---
title: Tasks & Threading
description: Running async work and marshalling onto the main thread.
order: 11
---

# API Reference: Tasks & Threading

Whisker runs UI on Lynx's TASM thread — Whisker's "main thread". The
reactive runtime is thread-local, so **`Signal::set`, `effect`, and every
other reactive primitive must run on the main thread**. This page covers
the three primitives for running async work, doing blocking work off the
main thread, and marshalling results back.

All three are in the prelude; they also live under
`whisker::runtime::tasks` (`spawn_local`, `run_blocking`) and
`whisker::runtime::main_thread` (`run_on_main_thread`).

```rust
use whisker::prelude::*;
```

| Function | Signature | Runs on |
|---|---|---|
| `spawn_local` | `(future: impl Future<Output = ()> + 'static)` | Main thread (cooperative) |
| `run_blocking` | `(f: impl FnOnce() -> T + Send + 'static) -> impl Future<Output = T>` | Fresh worker thread |
| `run_on_main_thread` | `(f: impl FnOnce() + Send + 'static)` | Main thread (marshalled) |

## `spawn_local`

```rust
spawn_local(async move {
    let body = run_blocking(fetch_blocking).await;
    data.set(parse(body));
});
```

Queues a `Future<Output = ()>` onto Whisker's thread-local task pool. The
future is polled on the main thread by the next tick, and runs **to stall
each frame** — `await` points yield back to the runtime so the UI stays
responsive. The future is **not** required to be `Send` (the pool is
strictly single-threaded), so it can freely capture signal handles. A
spawned task is owned by the pool; it has no join handle. Use
`run_blocking` when you need a typed result back into an `async` body.

## `run_blocking`

```rust
let body = run_blocking(|| {
    ureq::get("https://example.com")
        .call()
        .map_err(|e| e.to_string())?
        .into_string()
        .map_err(|e| e.to_string())
})
.await?;
```

Offloads a **synchronous, blocking** closure to a fresh worker thread and
returns a `Future` that resolves once it completes. Use it from inside an
`async fn` (or a [`resource`](/docs/reactivity-api) fetcher) for blocking
sync IO — `ureq`, `std::fs`, a sync DB driver — without freezing the main
thread. Both `F` and `T` must be `Send + 'static` to cross the thread
boundary. The result is delivered back via `run_on_main_thread`, so the
awaiting future **resumes on the main thread**, not on the worker.

If the awaiting task's owner is disposed mid-fetch, the result is
discarded and the future parks (cancel-on-dispose semantics) — no panic.

## `run_on_main_thread`

```rust
std::thread::spawn(move || {
    let result = fetch_http_blocking("https://...");
    run_on_main_thread(move || {
        data.set(Some(result)); // safe: now on the main thread
    });
});
```

Posts a plain `FnOnce` from any thread onto the main-thread queue — the
equivalent of Android's `runOnUiThread`, iOS's `DispatchQueue.main.async`,
or gtk-rs's `MainContext::invoke`. Use it to marshal work back onto the
main thread from a background thread before touching any reactive
primitive. `f` must be `Send + 'static`.

`f` runs asynchronously; the call returns immediately. Inside `f` the
reactive runtime is fully accessible — signal writes, effect
registrations, and context lookups all work as if you were in an event
handler, and dirtying writes wake the host's render loop automatically.
Before bootstrap registers the host dispatcher, the call is a no-op and
the closure is dropped (debug builds log a warning).

## Networking

Whisker ships **no built-in fetch**. The canonical approach is **any Rust
HTTP crate** (`ureq`, `reqwest`, …) driven through `run_blocking` and
surfaced as a [`resource`](/docs/reactivity-api):

```rust
let user = resource(|| async {
    run_blocking(|| {
        ureq::get("https://api.example.com/me")
            .call()
            .map_err(|e| e.to_string())?
            .into_json::<User>()
            .map_err(|e| e.to_string())
    })
    .await
});

// in render!:
render! {
    view {
        // resource accessors are reactive — the view re-renders
        // as the state transitions Loading -> Ready/Error.
        Show(when: move || user.loading()) { text(value: "Loading…") }
    }
}
```

For purely-async clients (a non-blocking HTTP library) you can skip
`run_blocking` and write the fetcher as a plain `async move { ... }`. See
[Reactivity](/docs/reactivity-api) for `resource` / `resource_sync` and
the `Resource<T>` accessors.
