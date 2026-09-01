---
title: Formatting
description: Format Rust and Whisker's compose-style macro invocations.
order: 17
---

# API Reference: Formatting

`whisker fmt` delegates ordinary Rust syntax to rustfmt, then formats the
compose-style invocations used by `render!`, `css!`, and `routes!`.

```sh
whisker fmt src/lib.rs
whisker fmt --check src/lib.rs
```

There is no separate Whisker formatting configuration. Width and indentation
come from the nearest `rustfmt.toml`.

## Layout rule

A fully one-line invocation stays on one line when it fits:

```rust
View(style: css!(width: px(100)))
```

Once an element invocation is multiline, each named argument occupies its own
line. A multiline nested `css!` remains indented as that argument's value:

```rust
View(
    style: css!(
        width: percent(100),
        height: px(88),
        border_radius: px(24),
        background_color: Color::hex(0x2563EB),
    ),
) {
    Text(value: "24px radius")
}
```

This follows rustfmt's general preference for compact expressions that fit and
one-item-per-line structure after breaking.

## rust-analyzer

Configure rust-analyzer to send the current buffer through stdin:

```json
{
  "rust-analyzer.rustfmt.overrideCommand": ["whisker", "fmt", "--stdin"]
}
```

`--stdin` reads Rust from standard input and writes only the formatted source
to standard output. `--check` never writes files and exits non-zero if any input
would change, which makes it suitable for CI.
