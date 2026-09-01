---
title: Platform Modules
description: Call Host services with the WhiskerValue contract.
order: 10
---

# API Reference: Platform Modules

A platform module exposes Host functionality that is not a mounted element:
storage, haptics, system status, or another service API. Rust and the Host are
independently compiled and match a package-qualified module name plus a method
name at runtime.

## Values

Arguments, return values, and event payloads all use `WhiskerValue`:

- `Null`
- `Bool`
- `Int`
- `Float`
- `String`
- `Bytes`
- `Array`
- `Object`
- `Error`

This avoids asking module authors to remember how each language represents a
boolean, integer, map, or missing value.

## Obtaining a module

`module!` qualifies a local name with the calling crate's package name:

```rust
let store = whisker::module!("LocalStore");
// Cargo package `acme-store` -> `acme-store:LocalStore`
```

Use `PlatformModule::named(...)` only when the fully-qualified name is already
known.

## Calling functions

```rust
let result = store.invoke(
    "get",
    vec![WhiskerValue::String("theme".into())],
);

let result = store
    .invoke_async("getAsync", vec![WhiskerValue::String("theme".into())])
    .await;
```

`invoke` must be completed by the Host before the call returns. Prefer
`invoke_async` for I/O and other work that cannot finish immediately. Runtime
or Host errors are represented as `WhiskerValue::Error` at this low-level API;
module crates should wrap these calls in typed Rust APIs.

## Events

```rust
let subscription = store.on_event("changed", move |payload| {
    // inspect or deserialize WhiskerValue
});
```

The returned subscription is RAII: dropping it removes the listener. The Host
is notified only when the first listener for a `(module, event)` pair appears
and when the final listener disappears.

## Host boundary

Mobile dispatch goes through the Whisker Driver ABI. Web and desktop install
the same `ModuleHost` contract directly in Rust. Module code uses the same
`PlatformModule` API in all cases.
