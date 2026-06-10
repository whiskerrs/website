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

## Purely-async clients

If you use a non-blocking HTTP library (one that's already `async`), you
don't need `run_blocking` at all — write the fetcher as a plain
`async move { ... }` and `.await` the client directly. `run_blocking` is
specifically the bridge for **synchronous** APIs.

## Where to go next

- [Tasks reference](/docs/tasks) — exact signatures, `Send` bounds, and
  cancel-on-dispose semantics for `spawn_local`, `run_blocking`, and
  `run_on_main_thread`.
- [Reactivity reference](/docs/reactivity-api) — `resource`,
  `resource_sync`, and the full `Resource<T>` / `ResourceState<T>` API.
- [State Management](/docs/state-management) — the signals you write
  results into.
