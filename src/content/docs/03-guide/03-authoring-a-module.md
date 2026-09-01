---
title: Authoring a Module
description: Ship one typed Rust API with symmetric Host implementations.
order: 3
---

# Authoring a Module

A module package keeps its shared Rust API at the root and places each Host
implementation beside it:

```text
whisker-toggle/
├── Cargo.toml
├── src/lib.rs
├── android/src/main/kotlin/.../ToggleModule.kt
├── build.gradle.kts
├── ios/Sources/WhiskerToggle/ToggleModule.swift
├── Package.swift
├── desktop/Cargo.toml
├── desktop/src/lib.rs
├── web/Cargo.toml
└── web/src/lib.rs
```

Start with:

```sh
whisker new-module whisker-toggle
```

The generated module is a normal Cargo package. Check its sources in; module
implementations are authored code, not generated bindings.

## Package metadata

```toml
[package.metadata.whisker]

[package.metadata.whisker.desktop]
package = "whisker-toggle-desktop-host"

[package.metadata.whisker.web]
package = "whisker-toggle-web-host"
```

The empty marker makes the package discoverable. Desktop and Web name the Host
crates Cargo should select for those targets. Swift Package Manager and Gradle
resolve the mobile sources through `Package.swift` and `build.gradle.kts`.

## Declare a Host element in Rust

```rust
use whisker::{Signal, Style};
use whisker::event::CustomEvent;

#[whisker::module_element(
    name = "acme.toggle/Toggle",
    measurement = None,
    commands = [("setChecked", Bool)],
)]
pub fn toggle(
    checked: Signal<bool>,
    disabled: Signal<bool>,
    style: Style,
    on_change: CustomEvent,
) {
}
```

The macro creates the PascalCase `Toggle(...)` builder and an element schema.
Signal props can update after mount. Event props begin with `on_`. Commands are
one-way and accept one declared `WhiskerValue` shape.

Choose `measurement = None` for layout-determined elements and `Custom` when
the Host must report an intrinsic size, as text or an asynchronously loaded
image does. Whether an element accepts children is inferred from a `Children`
argument; Host-only child-container details remain in the Host implementation.

## Implement the same contract on each Host

The API shape is intentionally symmetric even though the registration
mechanism is native to each platform.

### Android

```kotlin
@WhiskerModule
class ToggleModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("Toggle")
        View("acme.toggle/Toggle", ToggleView::class.java) {
            Prop("checked") { view: ToggleView, value ->
                view.setChecked(value.asBool() ?: false)
            }
            Events("change")
            Command("setChecked") { view: ToggleView, value ->
                view.setChecked(value.asBool() ?: false)
            }
        }
    }
}
```

### iOS

```swift
@WhiskerModule
public final class ToggleModule: Module {
    public override func definition() -> ModuleDefinition {
        ModuleDefinition {
            Name("Toggle")
            View("acme.toggle/Toggle", ToggleView.self) {
                Prop("checked") { (view: ToggleView, value: WhiskerValue) in
                    view.setChecked(value.asBool ?? false)
                }
                Events("change")
                Command("setChecked") { (view: ToggleView, value: WhiskerValue) in
                    view.setChecked(value.asBool ?? false)
                }
            }
        }
    }
}
```

Desktop and Web define the same names with their Rust Host SDK builders. Host
code creates and updates only its own view. Whisker's root Host applies layout,
paint, clipping, accessibility, event routing, and child insertion from the
shared frame protocol.

## Service functions and events

Native definitions may also declare `Function`, `AsyncFunction`, `Events`, and
observation hooks. Wrap them in a typed Rust facade over `module!`:

```rust
pub async fn load(key: String) -> Result<WhiskerValue, String> {
    match whisker::module!("Store")
        .invoke_async("load", vec![WhiskerValue::String(key)])
        .await
    {
        WhiskerValue::Error(message) => Err(message),
        value => Ok(value),
    }
}
```

## Compatibility failures

The Rust schema and Host catalog are compared by name and value kind when the
Host starts. A missing element, property, event, or command is a clear runtime
registration error. Keep those names stable within a released major version
and test each Host against shared conformance fixtures.
