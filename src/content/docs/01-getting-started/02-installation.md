---
title: Installation
description: Install the Whisker CLI and the toolchain for your target Hosts.
order: 2
---

# Installation

Whisker apps are regular Rust crates driven by the `whisker` CLI. This
page sets up the toolchain; the next page scaffolds and runs an app.

## Prerequisites

- **Rust 1.85 or newer** (install via [rustup](https://rustup.rs)).
- **iOS**: Xcode and its Command Line Tools. Simulator builds work out
  of the box.
- **Android**: an Android SDK, the NDK (`21.1.6352462`), and a JDK.
- **Web**: the `wasm32-unknown-unknown` Rust target and a modern browser.
- **Desktop**: the native build toolchain for your OS and graphics drivers
  supported by wgpu. `whisker run desktop` currently ships the macOS path.

Add the device build targets you plan to use:

```bash
rustup target add aarch64-apple-ios-sim    # iOS Simulator
rustup target add aarch64-linux-android    # Android device/emulator
rustup target add wasm32-unknown-unknown   # Web
```

## Install the CLI

```bash
cargo install whisker-cli
```

This installs the `whisker` command (and a `cargo whisker` alias). It is the
user-facing entry point for every Host. Xcode and Gradle can also invoke
Whisker's build adapter from their own build phases, so generated mobile
projects remain buildable from the native IDEs.

## Check your setup

`whisker doctor` inspects your toolchain and reports exactly what's
present or missing — Rust targets, Android SDK/NDK/JDK, Xcode:

```bash
whisker doctor
```

Fix anything it flags before moving on. You can scope it with
`--no-ios` or `--no-android` if you only care about one platform. See
the [CLI reference](/docs/cli-reference) for all options.

## Next

Continue to [Your First App](/docs/your-first-app) to scaffold and run a
project.
