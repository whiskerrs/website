---
title: Formatting
description: whisker fmt — a rustfmt drop-in that also formats render!, css!, and routes! macro bodies.
order: 17
---

# API Reference: Formatting

`whisker fmt` is a **rustfmt drop-in**. It formats your code by delegating to
the real `rustfmt` binary, and *additionally* formats the `render!`, `css!`,
and `routes!` macro bodies that plain rustfmt leaves untouched — rustfmt
never reaches inside a macro's token tree, so those blocks normally stay
exactly as you typed them. As of the latest version it also formats the Rust
expressions embedded inside those macro bodies (keyword-argument values,
event-handler closures, transition expressions, `format!(…)` arguments, …)
by running them through rustfmt too.

For non-macro code the output matches `cargo fmt`, because it *is* rustfmt
underneath.

## Behavior

- **No whisker-specific config.** `whisker fmt` respects only your
  [`rustfmt.toml`](https://rust-lang.github.io/rustfmt/). `max_width`,
  `tab_spaces`, `hard_tabs`, and `edition` all come from rustfmt's own
  settings and are used as-is — for the base pass *and* for the macro and
  embedded-expression formatting. There are no whisker-invented options.
- **Project toolchain rustfmt.** It locates rustfmt via `$RUSTFMT`, then
  `rustup which rustfmt`, then `rustfmt` on `PATH` — so it uses your
  project toolchain's rustfmt, and non-macro output stays identical to
  `cargo fmt`.
- **Idempotent.** Running it twice produces no further changes.

## Usage

```text
whisker fmt [FILES…] [--check] [--stdin]
```

| Argument / Option | Notes |
|---|---|
| `[FILES…]` (positional) | Format each file in place. |
| `--check` | Print a unified diff per file and exit non-zero if anything would change; don't write. Use it in CI. |
| `--stdin` | Read source from stdin, write the formatted result to stdout. The editor-integration entry point. With `--check`, diff to stderr and exit non-zero. |

```sh
# format files in place
whisker fmt src/lib.rs src/components/card.rs

# fail CI if anything is unformatted
whisker fmt --check src/lib.rs
```

## Example

Plain rustfmt would tidy the function signature but leave the `render!` body
on one line. `whisker fmt` formats both — and the closure, kwargs, and
`format!(…)` inside it.

Before:

```rust
fn ui()->Element{render!{view(on_tap:move |e|{let n=count.get();count.set(n+1);},style:"flex:1;"){text(value:format!("count: {}",count.get()))}}}
```

After:

```rust
fn ui() -> Element {
    render! {
        view(
            on_tap: move |e| {
                let n = count.get();
                count.set(n + 1);
            },
            style: "flex:1;",
        ) {
            text(value: format!("count: {}", count.get()))
        }
    }
}
```

The same applies to `css!`, whose keyword arguments are formatted one per
line:

```rust
let style = css!(
    display: Display::Flex,
    flex_direction: FlexDirection::Column,
    gap: 12.px(),
);
```

And `routes!`, whose nested containers and keyword arguments are indented
consistently:

```rust
routes! {
    Route(component: TabsLayout) {
        Switch {
            Route(path: "(home)") {
                Stack {
                    Route(path: "", component: Home)
                    Route(path: "detail/:id", component: Detail)
                }
            }
            Route(path: "(search)") {
                Stack {
                    Route(path: "search", component: Search)
                }
            }
        }
    }
    Route(
        path: "compose",
        component: Compose,
        transition: RouteTransition::modal(),
    )
}
```

## Format-on-save in your editor

`whisker fmt --stdin` is the editor-integration entry point. Wire it up
through rust-analyzer's `rustfmt.overrideCommand`. Because every
rust-analyzer host — VS Code, Zed, Neovim, Helix, and others — reads the
same `rust-analyzer.toml`, this is editor-agnostic. Drop a
`rust-analyzer.toml` at your project root:

```toml
[rustfmt]
overrideCommand = ["whisker", "fmt", "--stdin"]
```

With that in place, format-on-save formats your `render!`, `css!`, and
`routes!` blocks too, not just the Rust around them.

> **`whisker new` scaffolds this for you.** New projects ship with the
> `rust-analyzer.toml` above, so `render!`/`css!`/`routes!` format-on-save
> works out of the box.

Two things to note:

- The `whisker` CLI must be on your `PATH`, since that's what the override
  invokes.
- rust-analyzer runs the override with the **workspace as the current
  directory**, so the nearest `rustfmt.toml` is still honored — your
  `max_width`, `tab_spaces`, and `edition` apply exactly as they do on the
  command line.

## Known limitations

`whisker fmt` is conservative — it never produces invalid code, and it
prefers leaving a block untouched over risking a regression.

- A macro body that contains comments in the **macro grammar** (between
  tags or arguments, rather than inside an expression value) is left
  untouched rather than risk dropping the comment. Comments *inside* an
  expression value are preserved and reformatted with it.
- Embedded expressions are handed to rustfmt at a fixed, shallow
  indentation. An expression near `max_width` that lands at a deep column
  can therefore wrap a few columns later than a from-scratch rustfmt run
  would — the same trade-off `dioxus-fmt` and `yew-fmt` make. The result
  is always valid; only the wrap point differs.
