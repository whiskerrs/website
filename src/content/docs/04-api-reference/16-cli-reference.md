---
title: CLI Reference
description: Run, build, scaffold, inspect, and format Whisker projects.
order: 16
---

# API Reference: CLI Reference

Install the CLI from Cargo:

```sh
cargo install whisker-cli
```

The package installs both `whisker` and the `cargo whisker` shim. The examples
below use the direct form.

## Global options

| Option            | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `-v`, `--verbose` | Show raw Cargo, native toolchain, device, and internal logs  |
| `--no-tui`        | Use deterministic line output instead of the interactive TUI |
| `--help`          | Show the exact options supported by the installed version    |

The TUI is disabled automatically when output is piped or runs under CI.

## `whisker run`

```sh
whisker run android
whisker run ios
whisker run web
whisker run desktop
```

`run` syncs `gen/<platform>/`, builds, installs or serves the app, launches the
Host, watches source files, and applies hot patches when possible.

| Option                    | Default                  | Purpose                           |
| ------------------------- | ------------------------ | --------------------------------- |
| `--manifest-path <PATH>`  | nearest package manifest | Select the app crate              |
| `--bind <ADDR>`           | `127.0.0.1:9876`         | Dev server/Web address            |
| `--no-hot-patch`          | off                      | Require explicit full reloads     |
| `--workspace-root <PATH>` | discovered               | Override the Cargo workspace root |

Interactive keys are shown in the TUI. Common actions are `r` for a hot reload,
`R` for a full reload, `o` to relaunch/open, and `q` to quit.

`desktop` currently launches the macOS Host. The desktop rendering library is
shared with Windows and Linux, but their launch shells are not yet exposed by
this target.

## `whisker build`

```sh
whisker build appbundle
whisker build apk
whisker build ipa
whisker build macos
whisker build web
```

The command syncs the same `gen/` project used by `run` and produces a
distributable artifact. Android and iOS commands integrate with Whisker's
credential store; macOS produces an `.app`; Web produces a static HTML,
JavaScript, and WebAssembly bundle. Run `whisker build <kind> --help` for
signing and output options.

Generated Android and iOS projects are ordinary Gradle and Xcode projects.
After generation, their IDE or native build command can compile the app without
placing `whisker run` around the build.

## Scaffolding and diagnostics

| Command                     | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `whisker new <name>`        | Create an app crate and workspace                             |
| `whisker new-module <name>` | Create Rust, Swift, Kotlin, Web, and desktop module structure |
| `whisker doctor`            | Check Rust targets and native SDK/toolchain availability      |
| `whisker credential ...`    | Create, import, or rotate signing credentials                 |
| `whisker fmt ...`           | Run rustfmt plus Whisker macro formatting                     |

`build-ios`, `build-android`, and `modules` are internal build-system entry
points. Generated Xcode/Gradle projects call them; application developers
should not invoke them directly.
