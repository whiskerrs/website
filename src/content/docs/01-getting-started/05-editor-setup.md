---
title: Editor Setup
description: Get autocompletion and inline errors for Whisker code.
order: 5
---

# Editor Setup

Whisker is plain Rust, so any editor with
[rust-analyzer](https://rust-analyzer.github.io/) gives you
autocompletion, go-to-definition, and inline type errors out of the box —
VS Code, Zed, JetBrains (RustRover/IntelliJ with the Rust plugin), Neovim,
and others.

## Recommended setup

1. Install **rust-analyzer** for your editor.
2. Open the project root (the folder with `Cargo.toml`).
3. Let it index once; after that, completion and diagnostics are live.

## Completion inside `render!`

`render!` is a macro, but it's written so rust-analyzer can still help
inside it:

- Element names complete (`Vie` → `View`, `Te` → `Text`).
- Keyword-argument names complete (`View(sty…` → `style`).
- Component names and their props complete like any function call.

If completion inside the macro ever looks stale, a quick "restart
rust-analyzer" / reload refreshes its macro expansion.

## Formatting

Use [`whisker fmt`](/docs/formatting) — a rustfmt drop-in that formats your
Rust _and_ the `render!` / `css!` macro bodies (and the expressions inside
them) that plain `cargo fmt` leaves untouched. It respects your
`rustfmt.toml` and nothing else.

For format-on-save, point rust-analyzer at its `--stdin` mode in a
`rust-analyzer.toml` at the project root:

```toml
[rustfmt]
overrideCommand = ["whisker", "fmt", "--stdin"]
```

`whisker new` scaffolds this file automatically, so new projects get
`render!`/`css!` format-on-save out of the box. See
[Formatting](/docs/formatting) for the full setup.

## Next

You're set up — head to [Components & `render!`](/docs/components) to
start building, or browse the [API Reference](/docs/overview).
