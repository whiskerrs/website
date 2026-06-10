---
title: CLI Reference
description: The whisker command and its subcommands.
order: 16
---

# API Reference: CLI Reference

The `whisker` command scaffolds, inspects, and dev-loops Whisker apps.

## Installation

```sh
cargo install whisker-cli
```

The same package also installs a `cargo-whisker` shim, so every command
below can be invoked either directly (`whisker run ios`) or through Cargo
(`cargo whisker run ios`).

For Android builds, also install the build helper:

```sh
cargo install whisker-build
```

## `whisker [--verbose] <subcommand>`

| Option | Notes |
|---|---|
| `-v`, `--verbose` | Show every step's full underlying output (raw `cargo` / `xcodebuild` / `simctl` streams + internal debug logs). Global; applies to any subcommand. Equivalent to `WHISKER_VERBOSE=1`, which subprocesses inherit. |

The four subcommands are `doctor`, `run`, `new`, and `new-module`.

## `whisker doctor`

Inspect the local toolchain — Rust targets, Android NDK/SDK/JDK, and
Xcode.

| Option | Notes |
|---|---|
| `--no-ios` | Skip the iOS section. |
| `--no-android` | Skip the Android section. |

## `whisker run <target>`

Build, install, launch, and dev-loop a Whisker app — file watch + rebuild
+ subsecond hot patches pushed over WebSocket. Run it from inside the app
crate.

| Argument / Option | Default | Notes |
|---|---|---|
| `<target>` (positional) | required | `ios` or `android`. |
| `--manifest-path <PATH>` | walk up from cwd | Path to the app crate's `Cargo.toml`. |
| `--bind <ADDR>` | `127.0.0.1:9876` | WebSocket bind address the device dials (via `WHISKER_DEV_ADDR`) to receive patches. |
| `--no-hot-patch` | off | Opt out of Tier 1 subsecond hot-patching; fall back to Tier 2 cold rebuilds. |
| `--workspace-root <PATH>` | walk up from manifest | Override the workspace root (directory holding the `[workspace]` `Cargo.toml`). |
| `--show-native-logs` | off | Stream every line of the device's stdout/stderr, including Lynx C++ engine chatter the curated default suppresses. |
| `--no-tui` | auto | Disable the inline status bar. On by default when stderr is a TTY; auto-off when piping or under CI. |

```sh
whisker run ios
whisker run android --bind 0.0.0.0:9876
```

The positional `target` is required — there is no bare `whisker run`
form. Pair `--show-native-logs` with `WHISKER_VERBOSE=1` (or `--verbose`)
for the fullest output.

## `whisker new <name>`

Scaffold a new Whisker app — a single-crate workspace with `Cargo.toml`, a
`#[whisker::main]` `src/lib.rs`, the `whisker.rs`
[`Config`](/docs/configuration-api) probe, `.gitignore`, and `README.md`.
The result compiles standalone.

| Argument / Option | Default | Notes |
|---|---|---|
| `<name>` (positional) | required | Cargo crate name (kebab-case). |
| `--path <PATH>` | cwd | Parent directory; the crate lands at `<path>/<name>/`. |
| `--bundle-id <ID>` | `rs.example.<snake_name>` | iOS bundle id / Android `applicationId`. |
| `--display-name <NAME>` | title-cased crate name | Human-readable app display name. |

```sh
whisker new my-app
cd my-app
whisker run ios
```

## `whisker new-module <name>`

Scaffold a new Whisker module crate — `Cargo.toml` (with the
`[package.metadata.whisker]` marker), `Package.swift`, `build.gradle.kts`,
and skeleton Rust / Swift / Kotlin sources.

| Argument / Option | Default | Notes |
|---|---|---|
| `<name>` (positional) | required | Cargo crate name (kebab-case, conventionally `whisker-` prefixed). |
| `--path <PATH>` | cwd | Parent directory; the crate lands at `<path>/<name>/`. |
| `--shape <SHAPE>` | `view-bearing` | `view-bearing` generates a native-view component; `function-only` generates a function-call-only module (no UI). |

```sh
whisker new-module whisker-camera
whisker new-module whisker-secure-store --shape function-only
```

See [First-party Modules](/docs/modules-api) for examples of the modules
this command scaffolds, and the module authoring guide for filling in the
platform code.
