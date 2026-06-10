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

- Tag names complete (`vie` → `view`, `te` → `text`).
- Keyword-argument names complete (`view(sty…` → `style`).
- Component names and their props complete like any function call.

If completion inside the macro ever looks stale, a quick "restart
rust-analyzer" / reload refreshes its macro expansion.

## Formatting

Use `cargo fmt` as usual. `render!` blocks format as normal Rust token
trees.

## Next

You're set up — head to [Components & `render!`](/docs/components) to
start building, or browse the [API Reference](/docs/overview).
