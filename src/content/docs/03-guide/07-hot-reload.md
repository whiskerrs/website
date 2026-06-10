---
title: Hot Reload
description: How the sub-second dev loop works, and how to troubleshoot it.
order: 7
---

# Hot Reload

`whisker run <target>` is more than a one-shot build. It watches your
source, and on every save it decides — automatically — whether it can
patch the running app in place or has to rebuild it from scratch. The
fast path is usually under a second, with your app's state intact.

```sh
whisker run ios
whisker run android
```

This guide explains the two tiers, what triggers which, what survives a
reload, and what to do when it doesn't behave.

## The dev loop

On startup, `whisker run` builds your app, installs it on the device or
Simulator, launches it, and then keeps watching your files. Each
subsequent save kicks off the reload machinery:

```
you save a .rs file
        │
        ▼
file watcher  →  decide tier  →  Tier 1 patch  ·or·  Tier 2 rebuild
```

The dev server (on your machine) and the running app talk over a local
WebSocket. The app dials the dev server; on Android the device-to-host
hop is bridged with `adb reverse` automatically, so you don't set
anything up.

## Tier 1 — sub-second hot patch

For a change Whisker can patch — typically a Rust code edit (a function
body, a value, view markup) inside a watched crate — it compiles just
the changed code into a small patch object, ships it over the WebSocket,
and applies it to the **already-running** app. No reinstall, no
relaunch.

The headline property is **state preservation**: signals, scroll
positions, and animation phase survive the swap, because Whisker
rewrites function pointers in the live process rather than replacing the
whole binary. On a warm cache this is usually well under a second.

This is the common path while iterating on UI and logic. Edit, save,
watch the screen update — the counter you were poking at keeps its
value.

## Tier 2 — cold rebuild

Some changes can't be expressed as a function-pointer swap. When that's
the case, Whisker falls back to a full rebuild: recompile, reinstall,
relaunch. Expect this to take roughly 5–30 seconds depending on the
change and your cache, and note that **local app state is lost** — the
app starts fresh.

Tier 2 is also the baseline the loop uses when Tier 1 isn't applicable
or has been disabled.

## What triggers which tier

| Change | Tier | State |
|---|---|---|
| Edit a function body / view markup in a watched crate | Tier 1 (patch) | Preserved |
| Change a `Cargo.toml` (add/remove/bump a dependency) | Tier 2 (rebuild) | Lost |
| Add a `thread_local!` in the patched function | Tier 2 (rebuild) | Lost |
| Native config changes (the generated project changes) | Tier 2 (rebuild) | Lost |
| Tier 1 patch fails to build or apply | Tier 2 (fallback) | Lost |

In short: code-only edits to your Rust go through Tier 1; anything that
moves the dependency graph or the native project goes through Tier 2.
When Tier 1 can't be done safely, the loop quietly does Tier 2 instead —
you never get a stuck dev loop, just a slower reload.

## Security

The patch channel ships native code to a running process, so it's worth
knowing how it's locked down — briefly, because the defaults are safe:

- The dev server **binds to loopback** (`127.0.0.1:9876`) by default, so
  nothing off your machine can reach it.
- Each session generates a **random per-session token**. The app must
  present a matching token in its connection handshake before the server
  forwards any patch; a missing or wrong token closes the connection.

This only becomes relevant if you deliberately expose the server on a
LAN with `--bind` (e.g. `--bind 0.0.0.0:9876` to reach a physical
device on the same network). There, the token is what stops an
unauthenticated peer from pushing arbitrary native code, so don't
disable it.

## Troubleshooting

**Force a cold rebuild.** Pass `--no-hot-patch` to opt out of Tier 1
entirely and always use Tier 2. Useful when you suspect a patch is
stale or want to rule out hot-patching as the cause of a bug:

```sh
whisker run ios --no-hot-patch
```

**A change fell back to Tier 2 unexpectedly.** The usual cause is that
the edit wasn't a pure code change — a `Cargo.toml` touch, a new
dependency, a new `thread_local!`, or a change that reaches the native
project will all force a rebuild. Re-run with `--verbose` (or
`WHISKER_VERBOSE=1`) to see why the loop chose the tier it did.

**The device can't reach the dev server.** Tier 1 needs a live WebSocket
between the app and your machine. On Android the `adb reverse` bridge is
set up for you; if it breaks, confirm the device is visible to `adb` and
re-run. On a physical device over LAN, make sure you started with
`--bind` on an address the device can actually dial, and that no
firewall is in the way.

Every flag mentioned here is documented in the
[CLI reference](/docs/cli-reference).
