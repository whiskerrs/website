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
├── Cargo.toml      # crate + whisker dependency
├── src/lib.rs      # your app — a #[whisker::main] function
├── whisker.rs      # app config (bundle id, name, platform settings)
├── .gitignore
└── README.md
```

The generated `src/lib.rs` is a working counter:

```rust
use whisker::prelude::*;

#[whisker::main]
fn app() -> Element {
    let count = RwSignal::new(0);

    render! {
        page(style: "flex-direction: column; padding: 24px; gap: 16px;") {
            text(value: computed(move || format!("Taps: {}", count.get())))
            view(on_tap: move |_| count.set(count.get() + 1)) {
                text(value: "Tap me")
            }
        }
    }
}
```

## Run

Boot a simulator/emulator (or connect a device), then:

```bash
whisker run ios       # or: whisker run android
```

The first run sets up the native host project under `gen/`, builds your
crate, and installs and launches the app. It takes a moment; subsequent
runs are much faster.

> **Targets are positional**: `whisker run ios` / `whisker run android`
> (not `--ios`). See the [CLI reference](/docs/cli-reference) for flags
> like `--bind` and `--no-tui`.

## Edit with hot reload

Leave `whisker run` running and edit `src/lib.rs` — change the button
text, tweak a style, add a `view`. Save, and the change **hot reloads**
onto the running app in about a second, with state preserved.

Changes to `whisker.rs` (bundle id, app name, platform settings) reshape
the native project, so they need a full `whisker run` restart rather than
a hot reload.

## Next

- [Project Structure](/docs/project-structure) — what each file does.
- [Components & `render!`](/docs/components) — start building real UI.
