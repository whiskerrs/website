---
title: Debugging & Logging
description: Read logs and diagnose problems.
order: 8
---

# Debugging & Logging

Most of what you need while building a Whisker app shows up in the
terminal you ran `whisker run` from. This guide covers where your logs
go, how the runtime behaves when something panics, and which native
tools to reach for when the problem is below the Rust layer.

## App logs in the run terminal

`whisker run` captures the device's stdout/stderr and forwards it to the
terminal it's running in. That means your app's own output — `println!`,
`eprintln!`, and the `log` crate — appears right there:

```rust
use whisker::prelude::*;

fn on_tap() {
    println!("tapped at {:?}", std::time::Instant::now());
}
```

You do **not** need a separate `logcat` window (Android) or Console
session (iOS) just to read your own prints — the run loop already pulls
them in. The native-side firehose is suppressed by default so your logs
aren't buried; see [native logs](#native-side-logs) below to opt back
in.

## How panics behave

Whisker contains panics at the FFI boundary so a single bad `unwrap()`
doesn't take the whole app down. The runtime wraps the two places user
code crosses the C ABI in `catch_unwind`:

- **Frame ticks.** The per-frame reactive flush runs under
  `catch_unwind`. A panic there drops that frame — the app keeps
  running, and the runtime's internal guards keep reactive state
  consistent so the next tick proceeds cleanly.
- **Event handlers.** A panic in an `on_tap` / `on_<event>` handler is
  caught, the event is dropped (reported as "not consumed" so the
  native chain can fall back), and the app continues.

Either way the panic is **logged** — the message reaches stderr via the
default panic hook and is forwarded to your `whisker run` terminal. So a
panic shows up as a logged message and a dropped frame or event, not a
crash.

> This is contain-and-continue, not silently-ignore. If something isn't
> rendering or a tap does nothing, check the run terminal for a panic
> message before assuming a logic bug.

## Native-side logs

When the problem is below your application Rust — Host painting, the
Swift/Kotlin shell, or a native module — enable verbose output or use the
platform log tools.

Show the underlying build and device streams with verbose mode:

```sh
whisker --verbose run ios
WHISKER_VERBOSE=1 whisker run android
```

Or go straight to the platform tools in a separate terminal:

```sh
# Android
adb logcat

# iOS Simulator
xcrun simctl spawn booted log stream
```

These show Host diagnostics, native crashes, and system messages that are too
noisy for the default TUI.

## Environment problems

If the toolchain itself is the problem — a missing Rust target, an
Android NDK/SDK/JDK that isn't where it should be, an Xcode that's off —
run the doctor:

```sh
whisker doctor
```

It inspects your local setup and reports what's missing or
misconfigured. Use `--no-ios` / `--no-android` to skip a platform you
don't care about.

## More output

One global knob turns up the verbosity:

- `--verbose` / `WHISKER_VERBOSE=1` — show every step's full underlying
  output (raw `cargo` / `xcodebuild` / `simctl` streams and internal
  debug logs). It's global, applies to any subcommand, and subprocesses
  inherit the env var.

## Known gap

There is **no on-device red-box error overlay yet**. When something
panics, the signal is in the logs (the run terminal, or the native log
streams above) — not a banner on the screen. Keep the run terminal in
view while iterating.

See the [CLI reference](/docs/cli-reference) for every flag mentioned
here.
