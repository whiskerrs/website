---
title: Async & Data Loading
description: Fetch data and run async work.
order: 8
---

# Async & Data Loading

Real apps load data — from an HTTP API, the filesystem, a database. Whisker
ships **no built-in HTTP client** and no `fetch`. That's deliberate: you
already have the entire Rust ecosystem. Pick any crate you like
(`ureq`, `reqwest`, a database driver) and run it **off the reactive
thread**, then surface the result through a signal or a resource.

This page walks through the data-loading story end to end. The full method
signatures live in the [Tasks reference](/docs/tasks) and the
[Reactivity reference](/docs/reactivity-api) — here we focus on the
patterns.

```rust
use whisker::prelude::*;
```

## The threading rule

Whisker runs your UI on a single thread — the same thread that owns every
[signal](/docs/state-management). A blocking call like `ureq::get(...)`
would freeze that thread and stall the UI. So the rule is simple:

> Do blocking work on **another** thread, then marshal the result back to
> the main thread before touching a signal.

Three primitives make this ergonomic:

- **`run_blocking(closure)`** — run a synchronous, blocking call (a sync
  `ureq` request, `std::fs`, a sync DB query) on a fresh worker thread.
  Returns a `Future` you `.await`.
- **`spawn_local(future)`** — fire a local async task onto Whisker's
  single-threaded task pool. The future is polled cooperatively each tick,
  so `await` points keep the UI responsive.
- **`run_on_main_thread(closure)`** — post a closure back onto the main
  thread from any background thread, so it's safe to write signals.

These compose. `run_blocking` already hops its result back to the main
thread for you (it uses `run_on_main_thread` internally), so the future you
`.await` **resumes on the main thread** — meaning code after the `.await`
can write signals directly. You only reach for `run_on_main_thread` by hand
when you spawn a raw `std::thread` yourself.

## `resource` — the idiomatic way to load data

`resource(fetcher)` is the high-level primitive you'll use most. You hand
it an `async` fetcher returning `Result<T, String>`; it spawns the fetcher
on the task pool and gives you back a `Copy` handle that tracks three
states — **loading**, **ready**, and **error** — which you can branch on in
the view.

```rust
#[derive(Clone)]
struct Story {
    title: String,
    url: String,
}

#[component]
fn top_stories() -> Element {
    let stories = resource(|| async {
        // Blocking IO goes on a worker thread; the await resumes on
        // the main thread once the body is back.
        run_blocking(|| {
            ureq::get("https://example.com/top.json")
                .call()
                .map_err(|e| e.to_string())?
                .into_string()
                .map_err(|e| e.to_string())
        })
        .await
        .and_then(|body| parse_stories(&body))
    });

    render! {
        view(style: "flex-direction: column;") {
            // `loading()` reads the resource reactively, so this
            // Show flips automatically when the fetch lands.
            Show(when: move || stories.loading()) {
                text(value: "Loading…")
            }
            StoryList(stories: stories)
        }
    }
}
```

The accessors (`get`, `loading`, `error`, `state`) all read the underlying
signal **reactively** — calling them inside a `render!` prop or an
[`effect`](/docs/reactivity-api) re-renders the view as the state
transitions. A `resource` fetcher almost always wraps its blocking IO in
`run_blocking`, exactly as above.

### Branching on `ResourceState`

For loading-vs-loaded-vs-error in one place, match on the full state:

```rust
#[component]
fn story_list(stories: Resource<Vec<Story>>) -> Element {
    render! {
        view(style: "flex-direction: column;") {
            // `state()` is a reactive read; this match re-runs on
            // every state transition.
            Match(on: move || stories.state()) {
                Loading => text(value: "Loading…")
                Error(msg) => text(value: msg)
                Ready(list) => view {
                    For(each: move || list.clone(), key: |s| s.url.clone()) {
                        |story| render! { text(value: story.title) }
                    }
                }
            }
        }
    }
}
```

`ResourceState<T>` is a plain enum (`Loading`, `Ready(T)`, `Error(String)`)
with `is_loading()` / `is_ready()` / `is_error()` helpers. See
[Control Flow](/docs/control-flow) for `Show`, `Match`, and `For`.

## Reactive / keyed resources

A `resource` is **reactive**, not one-shot. The fetcher runs inside an
[effect](/docs/reactivity-api), so every signal you read while it runs
becomes a dependency — and when one of those signals changes, the fetcher
**re-runs and the resource re-fetches**. That makes `resource` the right
tool for a *keyed* fetch: a query, a selected id, a page number.

Read the dependency **inside the async block** — that's where tracking is
active. (A read in the synchronous closure body that merely *returns* the
future runs once at setup and is **not** tracked; see the pitfall below.)
Here a search box drives an iTunes-style lookup that re-fetches as the
query changes:

```rust
let query = RwSignal::new(String::new());

let results = resource(move || async move {
    let q = query.get();                 // read inside the async block → tracked
    if q.trim().is_empty() {
        return Ok(Vec::new());
    }
    run_blocking(move || itunes::search(&q))
        .await
        .map_err(|e| e.to_string())
});

// Later, anywhere — each set re-runs the fetcher:
query.set("design".into());   // results → Loading, then Ready(design hits)
query.set("news".into());     // results → Loading, then Ready(news hits)
```

While a re-fetch is in flight the resource returns to `Loading`, so a
`Show(when: move || results.loading())` flips back automatically. A
**generation guard** discards stale in-flight results: if `query` changes
again before the previous request lands, only the latest query commits —
no out-of-order flicker. This mirrors the shape we ship in
`examples/podcast/crates/podcast-feature-search`.

> **Common pitfall: where you read the signal decides whether it
> re-fetches.** Tracking happens while the **async block** runs. Read the
> signal *inside* the async block and the resource is reactive — it
> refetches on every change. Read it in a **synchronous prelude** that
> only *returns* the future, and the read happens once at setup, outside
> the tracked async body — so it is **not** a dependency and the resource
> **never refetches**.
>
> ```rust
> // ❌ WRONG — `sig.get()` runs in the synchronous closure body, BEFORE
> // the async block. Not tracked → never refetches when `sig` changes.
> resource(move || {
>     let q = sig.get();
>     async move { fetch(q).await }
> });
>
> // ✅ RIGHT — `sig.get()` runs INSIDE the async block, so it's tracked.
> resource(move || async move {
>     let q = sig.get();
>     fetch(q).await
> });
> ```
>
> The real `podcast-feature-search` repro calls `query.get()` inside the
> `async move { … }` block for exactly this reason.

### Fetch-dependency vs. derive

The deciding question is *what the signal does*:

- If a signal decides **what to fetch** — a query, an id, a page — put it
  inside the `resource` fetcher so changing it re-fetches.
- If a signal only **transforms already-fetched data** — client-side
  filtering, sorting, or projecting a list you already have — don't
  re-fetch. Wrap the resource in a [`computed`](/docs/reactivity-api)
  instead:

  ```rust
  let filter = RwSignal::new(String::new());

  // `results` was fetched once (or keyed on something else). `visible`
  // re-derives on the main thread when `filter` changes — no network.
  let visible = computed(move || {
      let needle = filter.get().to_lowercase();
      results
          .get()
          .unwrap_or_default()
          .into_iter()
          .filter(|p| p.name.to_lowercase().contains(&needle))
          .collect::<Vec<_>>()
  });
  ```

Re-fetching to do work the client can do is wasted IO; deriving over the
resource keeps it instant and offline-safe.

### `resource_sync` stays one-shot

`resource_sync(fetcher)` runs its fetcher **untracked** — it never
subscribes to the signals it reads, so it won't re-fetch. Use it for
already-in-memory or derived values where there's nothing to re-run.

## Loading a list into a signal

When you want more control than `resource` gives — kicking off the fetch on
a tap, retrying, or driving multiple pieces of state — load into a signal
yourself. Spawn an async task, do the blocking call on a worker, and write
the result back:

```rust
#[component]
fn podcast_search() -> Element {
    let results = RwSignal::new(Vec::<Podcast>::new());
    let error = RwSignal::new(Option::<String>::None);

    let on_search = move |_| {
        spawn_local(async move {
            // Blocking GET on a worker thread.
            let fetched = run_blocking(|| {
                search_blocking("technology", 25)
            })
            .await;

            // We're back on the main thread here — safe to write signals.
            match fetched {
                Ok(list) => results.set(list),
                Err(e) => error.set(Some(e.to_string())),
            }
        });
    };

    render! {
        view(style: "flex-direction: column;") {
            view(on_tap: on_search) {
                text(value: "Search")
            }
            For(each: move || results.get(), key: |p| p.id) {
                |podcast| render! { text(value: podcast.name) }
            }
        }
    }
}
```

This mirrors the shape of the real `examples/podcast` app, whose data layer
exposes blocking `search_blocking` / `fetch_episodes_blocking` functions
backed by `ureq`, then calls them through `run_blocking` from the UI crate.
Keeping the network code in its own crate of plain blocking functions —
testable without a UI — and only wiring `run_blocking` at the call site is
the pattern we recommend.

## Async clients and the reactor caveat

Whisker drives futures on a small **single-threaded cooperative executor**
(it polls your `async` work on the UI thread). It does **not** run an IO
reactor. That distinction matters:

- ✅ Futures that complete via the local executor's own wakeups —
  channels, `run_blocking` results, `spawn_local` tasks awaiting each
  other — `.await` directly with no extra setup.
- ⚠️ Futures from a **`tokio`-based** library (`reqwest`, `tokio::net`,
  `tokio::time`, …) need a tokio **runtime** to drive their IO/timers.
  Awaiting one directly on Whisker's executor **silently hangs** — the IO
  finishes on tokio's thread, but its cross-thread wake never re-polls the
  local pool. No panic, no log.

So for a tokio-based client, bridge through a tokio runtime on a worker
thread — `run_blocking` is the clean way:

```rust
use whisker::runtime::tasks::run_blocking;
// a process-wide tokio runtime (e.g. via once_cell::Lazy)
let body = run_blocking(move || RT.block_on(async move {
    reqwest::get(&url).await?.text().await
})).await?;
```

The result hops back to the UI thread automatically. A synchronous client
(`ureq`) is even simpler — just call it inside `run_blocking`. Either way,
`run_blocking` is the bridge from "code that needs another thread/runtime"
back into Whisker's reactive world. (See [Tasks](/docs/tasks) for the full
picture.)

## Foreign threads & `run_blocking`

The caveat above has a sharper edge worth calling out on its own, because
it's the single most common way to hang a Whisker app with no error to
point at.

> **Whisker's task pool does not support cross-thread wake.** If you
> `.await` a future whose waker fires from an **external** thread — most
> often a `JoinHandle` from `tokio::runtime().spawn(fut)` — that wake
> never reaches Whisker's task pool, and the `.await` **hangs forever**.
> No panic, no log, no timeout.

For the curious: Whisker drives its cooperative task pool off the native
**main loop**. A waker that fires on a foreign thread doesn't post to that
loop, so the parked task is never re-polled. This is *not* the same as a
deadlock you can spot in a stack trace — the thread is simply idle,
waiting for a wake that will never come.

So the wrong shape is awaiting a foreign `JoinHandle` directly:

```rust
// ❌ HANGS — the tokio runtime drives `fut` to completion on its OWN
// thread, then wakes the JoinHandle from there. That wake never reaches
// Whisker's main-loop task pool, so this `.await` parks forever.
let handle = runtime().spawn(fut);
let body = handle.await;          // never resumes
```

The supported bridge is **`run_blocking(|| …)`**. It runs the blocking /
foreign work on a worker thread and re-posts the result onto the main
loop, so the awaiting task resumes on the thread it was parked on. Its
signature (`crates/whisker-runtime/src/tasks.rs`):

```rust
pub fn run_blocking<F, T>(closure: F) -> impl Future<Output = T>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
```

For a synchronous client, call it straight inside the closure — exactly
as `examples/podcast/crates/podcast-feature-search` does:

```rust
run_blocking(move || {
    search(SearchQuery { term: q.trim(), limit: 20 })
})
.await
.map_err(|e: FetchError| e.to_string())
```

For a tokio-based future, **block on the runtime inside the closure**
rather than awaiting a foreign `JoinHandle`. The `block_on` runs on
`run_blocking`'s worker thread, and only the final `T` crosses back to the
main loop:

```rust
// ✅ Correct: block the worker thread on the tokio runtime; the result
// (a plain `T`) is re-posted to the main loop and the await resumes.
let body = run_blocking(move || runtime().block_on(fut)).await;
```

The rule of thumb: never let a foreign-thread waker be the thing Whisker
waits on. Cross the boundary with `run_blocking` and hand back a value,
not a future.

This is also why a [reactive `resource`](#reactive--keyed-resources)
fetcher almost always wraps its IO in `run_blocking` — the fetcher runs on
the task pool, so its `.await` points are subject to exactly this rule.

## Where to go next

- [Tasks reference](/docs/tasks) — exact signatures, `Send` bounds, and
  cancel-on-dispose semantics for `spawn_local`, `run_blocking`, and
  `run_on_main_thread`.
- [Reactivity reference](/docs/reactivity-api) — `resource`,
  `resource_sync`, and the full `Resource<T>` / `ResourceState<T>` API.
- [State Management](/docs/state-management) — the signals you write
  results into.
