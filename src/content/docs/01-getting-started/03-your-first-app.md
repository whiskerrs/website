---
title: Your First App
description: Scaffold a Whisker app and run it with hot reload.
order: 3
---

# Your First App

With the [toolchain installed](/docs/installation), you're three commands
from a running app.

## Scaffold

```bash
whisker new my-app
cd my-app
```

This generates a single-crate project that compiles standalone:

```text
my-app/
├── Cargo.toml          # crate + whisker dependency
├── src/lib.rs          # your app — a #[whisker::main] function
├── whisker.rs          # app config (bundle id, name, platform settings)
├── rust-analyzer.toml
├── .gitignore
└── README.md
```

The generated `src/lib.rs` is a working counter, split into small
components. Styles are trimmed here:

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    render! { Root }
}

/// The full-screen background. It holds no state.
#[component]
fn root() -> Element {
    render! {
        View(style: css!(flex_grow: 1.0 /* … */)) {
            Counter
        }
    }
}

/// Owns the count and hands it to `Card`.
#[component]
fn counter() -> Element {
    let count = signal(0);
    render! { Card(count: count) }
}

/// The UI you see on screen — the part you edit.
#[component]
fn card(count: RwSignal<i32>) -> Element {
    render! {
        View(style: css!(/* … */)) {
            Text(value: "My App")
            Text(value: "Tap +1, then edit `Card` and save. The count survives hot reload.")
            Text(value: computed(move || format!("{}", count.get())))
            View(style: css!(/* … */)) {
                Button(label: "-1", delta: -1, count: count)
                Button(label: "+1", delta: 1, count: count)
            }
        }
    }
}

#[component]
fn button(label: &'static str, delta: i32, count: RwSignal<i32>) -> Element {
    render! {
        View(on_tap: move |_| count.set(count.get() + delta), style: css!(/* … */)) {
            Text(value: label)
        }
    }
}
```

## Run

Choose a Host. Boot a simulator/emulator first when using mobile:

```bash
whisker run ios
whisker run android
whisker run web
whisker run desktop
```

The first run sets up the native host project under `gen/`, builds your
crate, and installs and launches the app. It takes a moment; subsequent
runs are much faster.

> **Targets are positional**: `whisker run ios` / `whisker run android` /
> `whisker run web` / `whisker run desktop`
> (not `--ios`). See the [CLI reference](/docs/cli-reference) for flags
> like `--bind` and `--no-tui`.

## Edit with hot reload

Leave `whisker run` running. Tap **+1** a few times, then edit `Card` in
`src/lib.rs` — change the title, tweak a style, add a `View`. Save, and the
change **hot reloads** onto the running app in about a second. The count
keeps its value: only `Card` is rebuilt, and the count lives in `Counter`.

Hot reload rebuilds the components you edited from scratch, so state owned
by an edited component resets. Keep state in a component above the ones you
iterate on, as the template does. Editing `Root`, `app()`, or code outside
components (a helper function, a type) rebuilds the whole UI. See
[Hot Reload](/docs/hot-reload) for the details.

Changes to `whisker.rs` (bundle id, app name, platform settings) reshape
the native project, so they need a full `whisker run` restart rather than
a hot reload.

## Next

- [Project Structure](/docs/project-structure) — what each file does.
- [Components & `render!`](/docs/components) — start building real UI.
