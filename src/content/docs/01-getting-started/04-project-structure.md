---
title: Project Structure
description: What each file in a Whisker project is for.
order: 4
---

# Project Structure

A Whisker app is an ordinary Rust crate with two Whisker-specific files.

```text
my-app/
├── Cargo.toml      # crate manifest + `whisker` dependency
├── src/lib.rs      # the app: a #[whisker::main] function
├── whisker.rs      # app configuration (compiled separately by the CLI)
├── .gitignore
├── README.md
├── gen/            # generated native host projects (do not edit, gitignored)
└── target/         # cargo build output (gitignored)
```

## `src/lib.rs`

Your application. It contains exactly one
[`#[whisker::main]`](/docs/macros) function returning an
[`Element`](/docs/elements), plus any
[`#[component]`](/docs/components) functions you add. As your app grows,
split it across modules and additional crates like any Rust project.

## `whisker.rs`

App **configuration** — bundle id, display name, version, and per-platform
settings. It's a small Rust file exposing a `configure` function:

```rust
use whisker_config::Config;

pub fn configure(app: &mut Config) {
    app.name("My App")
        .bundle_id("com.example.myapp")
        .version("1.0.0");
}
```

`whisker run` compiles `whisker.rs` as a tiny standalone probe and reads
the resulting config to generate the native projects. It's intentionally
separate from `src/lib.rs` so the config build stays fast. This is also
where you register [plugins](/docs/modules-and-plugins). Full field list:
[Configuration reference](/docs/configuration-api).

## `gen/`

The generated **native host projects** — an Xcode project under
`gen/ios/` and a Gradle project under `gen/android/`. Whisker regenerates
this tree on every `whisker run`, so:

- **Don't edit it by hand** — changes are overwritten. Shape the native
  side through `whisker.rs` and [plugins](/docs/plugin-api) instead.
- **Don't commit it** — it's in `.gitignore`. Delete it any time for a
  clean regenerate.

## `Cargo.toml`

A normal crate manifest. It depends on `whisker`, and you add
[first-party modules](/docs/modules-api) (like `whisker-router` or
`whisker-image`) here as you need them.

## Next

- [Editor Setup](/docs/editor-setup) — get autocompletion working.
- [Components & `render!`](/docs/components) — build your UI.
