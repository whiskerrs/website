---
title: Platform Modules
description: Calling native modules and the WhiskerValue argument model.
order: 10
---

# API Reference: Platform Modules

A **platform module** is a function-shaped native module — an iOS Obj-C
class or Android Kotlin class (both extending Lynx's `LynxModule`) — that
you call from Rust by name. This is the low-level surface; the first-party
modules (image, audio, …) wrap it for you (see
[First-party Modules](/docs/modules-api)).

```rust
use whisker::prelude::*;
```

> `PlatformModule`, `WhiskerValue`, and the `module!` macro live at the
> crate root (`whisker::…`), not the prelude. The
> [`module!`](/docs/macros) macro is documented under
> [Macros](/docs/macros).

## `module!("Name")` → `PlatformModule`

The `module!` declarative macro builds a `PlatformModule` handle,
prepending the calling crate's name so two crates can ship same-named
modules without colliding.

```rust
let store = whisker::module!("WhiskerLocalStore"); // -> "<crate>:WhiskerLocalStore"
let saved = store.invoke("save", vec![key.into(), value.into()]);
```

## `PlatformModule`

A lightweight, name-keyed reference (modelled on Expo's
`requireNativeModule`). No registry lookup happens at construction — an
unregistered module surfaces as a `WhiskerValue::Error` at `invoke` time.
`Clone`.

| Method | Signature | Notes |
|---|---|---|
| `named` | `PlatformModule::named(name: impl Into<String>) -> Self` | Reference a **fully-qualified** name (`<crate>:<Name>`). Prefer `module!`. |
| `name` | `&self -> &str` | The fully-qualified name this handle dispatches to. |
| `invoke` | `&self, function: &str, args: Vec<WhiskerValue> -> WhiskerValue` | Synchronous dispatch on the calling thread. Returns the raw value, with `WhiskerValue::Error` on failure. |
| `invoke_async` | `async &self, function: &str, args: Vec<WhiskerValue> -> WhiskerValue` | Resolves when the bridge fires the result callback. |
| `on_event` | `&self, event: &str, callback: F -> ModuleSubscription` where `F: Fn(WhiskerValue) + Send + Sync + 'static` | Subscribe to a module event. |

`invoke` is synchronous but **fire-and-forget-ish**: the method body runs
on the calling thread, but a method that produces a value you need should
go through `invoke_async` (or a typed wrapper), since the async path is
where the bridge delivers a reply. Native methods that touch UIKit /
Android Views from a background thread must marshal to the main thread
themselves (see [Tasks & Threading](/docs/tasks)).

```rust
let module = whisker::module!("Battery");
match module.invoke("getLevel", vec![]) {
    WhiskerValue::Float(level) => println!("battery: {level:.0}%"),
    WhiskerValue::Error(msg) => eprintln!("battery dispatch failed: {msg}"),
    other => eprintln!("unexpected reply: {other:?}"),
}
```

### `ModuleSubscription`

The RAII handle returned by `on_event`. **Dropping it unsubscribes** (and
frees the boxed closure), so the caller controls listener lifetime by
holding or dropping the value. The `OnStartObserving` / `OnStopObserving`
native hooks fire on the 0↔1 listener transition, letting a module
lazily attach / detach its source.

| Method | Signature | Notes |
|---|---|---|
| `error` | `&self -> Option<&str>` | `Some(_)` if registration failed; `None` for a live subscription. A failed subscription is inert. |
| `id` | `&self -> i32` | Bridge-assigned listener id (positive for live, `0` for failed). Mainly for tests / tracing. |

The event closure runs on whichever thread the bridge dispatches on
(typically the platform main thread) — hence the `Send + Sync` bound.

## WhiskerValue

`WhiskerValue` is the universal tagged-union value model that crosses the
Rust ⇄ native boundary as **data** (rather than a handle): module
function args / returns, element-method params (see
[Imperative & Refs](/docs/refs)), and event payloads (see
[Handling Events](/docs/events)) all travel as a `WhiskerValue`.

It is an intentionally **closed** enum — **not** `#[non_exhaustive]` — so
you may match it exhaustively. (Adding a variant is a deliberate, breaking
wire-format change touching both sides of the FFI boundary.)

| Variant | Payload |
|---|---|
| `Null` | — (the `Default`) |
| `Bool` | `bool` |
| `Int` | `i64` |
| `Float` | `f64` |
| `String` | `String` |
| `Bytes` | `Vec<u8>` |
| `Array` | `Vec<WhiskerValue>` |
| `Map` | `BTreeMap<String, WhiskerValue>` (deterministic key order) |
| `Error` | `String` (bridge / platform failure description) |

### Constructors & methods

| Item | Signature | Purpose |
|---|---|---|
| `map` | `WhiskerValue::map(entries: impl IntoIterator<Item = (impl Into<String>, WhiskerValue)>) -> Self` | Build a `Map` without importing `BTreeMap`. |
| `args` | `WhiskerValue::args(items: impl IntoIterator<Item = WhiskerValue>) -> Self` | Build the `{ "args": [ … ] }` params object Whisker module **elements** read. |
| `as_error` | `&self -> Option<&str>` | The message if `self` is `Error`, else `None`. |
| `deserialize_into` | `&self -> Result<T, String>` where `T: DeserializeOwned` | Decode the value tree into a typed `T` (via `serde`). |

### `From` conversions

`From<T>` impls let you build args with `value.into()`:

| `T` | Maps to |
|---|---|
| `()` | `Null` |
| `bool` | `Bool` |
| `i32` / `i64` / `u32` | `Int` |
| `f32` / `f64` | `Float` |
| `&str` / `String` | `String` |
| `Vec<u8>` | `Bytes` |
| `Vec<T>` where `T: Into<WhiskerValue>` | `Array` |

```rust
let store = whisker::module!("WhiskerLocalStore");

// `args: Vec<WhiskerValue>`, built positionally with `.into()`:
let result = store.invoke("save", vec![key.into(), value.into()]);

match result {
    WhiskerValue::Bool(ok) => println!("saved: {ok}"),
    other => {
        if let Some(msg) = other.as_error() {
            eprintln!("save failed: {msg}");
        }
    }
}
```

> Reach for `as_error` (or match `Error` explicitly) on every reply —
> dispatch failures arrive as a value, not a panic.

## `WhiskerModuleError`

A `String` newtype error: `pub struct WhiskerModuleError(pub String)`. It
wraps the description a `WhiskerValue::Error` carried (plus type-mismatch
messages a typed proxy synthesises). Implements `Display` +
`std::error::Error`, so the typed wrappers `?`-propagate it through
`Result` chains.

## The `whisker::platform_module` namespace

A lower-level surface for code that wants the raw functions directly,
re-exported from `whisker::platform_module`:

| Re-export | Purpose |
|---|---|
| `invoke` | `invoke(name: &str, method: &str, args: Vec<WhiskerValue>) -> WhiskerValue` — the free function `PlatformModule::invoke` calls. |
| `invoke_async` | Async variant. |
| `from_raw` | `unsafe` — copy a bridge-produced `WhiskerValueRaw` into an owned `WhiskerValue`. FFI plumbing. |

Most code should use the `PlatformModule` handle (or a typed wrapper)
instead. The first-party modules — image, audio, and friends — wrap all
of this for you; see [First-party Modules](/docs/modules-api).
