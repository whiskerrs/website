---
title: Async & Data Loading
description: Run asynchronous and blocking work without stalling the Host.
order: 8
---

# Async & Data Loading

Whisker supplies a small task bridge rather than choosing an application-wide
async runtime or HTTP client. The Host continues to own its event loop, and a
`RuntimeInstance` advances local futures during short drive transactions.

## Local async work

Use `spawn_local` when a future can run on the current runtime thread:

```rust
let state = signal(ResourceState::Loading);

spawn_local(async move {
    match load_profile().await {
        Ok(profile) => state.set(ResourceState::Ready(profile)),
        Err(error) => state.set(ResourceState::Error(error.to_string())),
    }
});
```

The future may be non-`Send`. Because it resumes inside the same
`RuntimeInstance`, it can update that instance's signals directly.

## Blocking and CPU-heavy work

Do not perform a blocking HTTP request, filesystem operation, image decode, or
large parse directly in an event handler. The runtime is executing on the Host
UI thread during that callback.

```rust
let stories = signal(Vec::<Story>::new());
let error = signal(None::<String>);

spawn_local(async move {
    let result = run_blocking(move || {
        let body = ureq::get("https://example.com/stories.json")
            .call()
            .map_err(|error| error.to_string())?
            .into_string()
            .map_err(|error| error.to_string())?;
        parse_stories(&body)
    })
    .await;

    match result {
        Ok(value) => stories.set(value),
        Err(message) => error.set(Some(message)),
    }
});
```

`run_blocking` sends the closure to a worker thread and resolves the result back
on Whisker's local executor. The closure and return value must be `Send +
'static`.

The HTTP library in this example is intentionally not part of Whisker. Choose a
transport that supports your target set; a native blocking client does not
automatically work in WebAssembly.

## Resources

`resource` packages loading, ready, and error state behind reactive accessors:

```rust
let stories = resource(|| async {
    run_blocking(fetch_and_parse_stories).await
});

render! {
    View(style: css!(flex_direction: FlexDirection::Column)) {
        Show(when: move || stories.loading()) {
            Text(value: "Loading…")
        }
        ForEach(
            each: move || stories.get().unwrap_or_default(),
            key: |story| story.id,
            children: |story| render! { Text(value: story.title) },
        )
    }
}
```

Choose `resource_sync` when the producer is synchronous but you still want the
same reactive state model.

## Callbacks from another thread

For callback-based libraries, capture the current instance's dispatcher before
leaving the runtime thread:

```rust
let dispatcher = runtime_dispatcher().expect("inside Whisker runtime");

start_operation(move |value| {
    dispatcher.post(move || result.set(value));
});
```

The dispatcher wakes the correct Host/runtime pair and rejects work after that
instance shuts down. This matters when an application contains multiple
`WhiskerView` instances.

See [Tasks & Threading](/docs/tasks) for exact API constraints.
