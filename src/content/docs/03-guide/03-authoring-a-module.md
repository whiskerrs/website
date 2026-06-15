---
title: Authoring a Module
description: Ship a native capability as a crate.
order: 3
---

# Authoring a Module

A **Whisker module** is a single cargo crate that ships Rust, Swift, and
Kotlin *together* to expose one native capability. From the consuming
app it looks like a normal dependency: add it to `Cargo.toml`, `use` its
types, and the build wires the native side in for you. This guide walks
through scaffolding one, the layout it uses, and how it reaches your
users.

If you only need the mental model — module vs. plugin, why distribution
works the way it does — read [Modules & Plugins](/docs/modules-and-plugins)
first. This page is the hands-on how-to. If the module is app-private and
lives in your own workspace, see
[Local Modules & Plugins](/docs/local-modules-and-plugins).

## The two shapes a module can take

Every module is one of two shapes, and you pick the shape up front
because it determines what gets scaffolded:

- **A native view module** — renders a platform-native widget you drop
  into `render!` as a tag. The Rust side is a thin element declared with
  `#[whisker::module_component("Name")]`; the Swift/Kotlin sides supply
  the real `UIView` / `View`. `whisker-image`'s `Image` and
  `whisker-video`'s `Video` are the references.

- **A function-shaped module** — a native capability with no view of its
  own, called from Rust. The Rust side dispatches through
  [`module!` / `PlatformModule`](/docs/platform-modules) and lifts the
  reply into a typed API. `whisker-local-store`'s `WhiskerLocalStore` is
  the reference.

> There is **no** `#[whisker::platform_module]` macro. Native view
> modules use `#[whisker::module_component("Name")]`; function-shaped
> modules call the `module!` declarative macro and need no attribute
> macro at all. (Older prose sometimes mentions a `platform_module`
> attribute — it does not exist.)

Picking the *user-facing surface* within those shapes (a pure component,
a `ref:`-bound handle, a `Clone` value handle, a free function returning
a signal, or static methods) is its own small design decision. The
[First-party Modules](/docs/modules-api) are worked examples of each:
model your API on the one whose semantics match yours.

## Step 1: Scaffold the crate

`whisker new-module` generates a complete, standalone-compiling
skeleton:

```sh
# A native view module (the default shape)
whisker new-module whisker-camera

# A function-shaped module with no view
whisker new-module whisker-geocoder --shape function-only
```

The crate name is a cargo package name — kebab-case, conventionally
prefixed `whisker-`. From it the scaffolder derives the PascalCase tag
(`Camera`), the module class (`CameraModule`), and — for view modules —
the view class (`CameraView`). Lynx registers a view module's element
under `<crate-name>:<tag>` (`whisker-camera:Camera`), so two unrelated
crates can ship same-named tags without colliding.

The `--shape` flag selects what gets written:

| `--shape` | Rust side | Native side |
|---|---|---|
| `view-bearing` (default) | a `#[whisker::module_component("Name")]` element | a DSL module with a `View(...)` block + a `WhiskerUI<View>` subclass |
| `function-only` | a `module!`-based typed wrapper | a DSL module with module-level `Function`s and no `View(...)` |

Either way you get the same set of files:

```
whisker-camera/
├── Cargo.toml              # carries [package.metadata.whisker]
├── Package.swift           # SwiftPM manifest (MUST sit at the root)
├── build.gradle.kts        # Gradle library manifest
├── README.md
├── src/
│   └── lib.rs              # the Rust API
├── ios/                    # Swift sources (Expo-style)
│   └── Sources/WhiskerCamera/
│       ├── CameraModule.swift
│       └── CameraView.swift      # view shape only
└── android/                # Kotlin sources (standard AGP nesting)
    └── src/main/kotlin/rs/whisker/modules/whisker_camera/
        ├── CameraModule.kt
        └── CameraView.kt         # view shape only
```

The skeleton compiles as-is, so you can `cargo build` immediately and
fill in the platform logic incrementally.

## Step 2: Understand the layout

The layout mirrors Expo Modules — native code grouped per platform under
top-level `ios/` and `android/` dirs, each openable directly in Xcode or
Android Studio. The three build manifests stay at the crate root:

- **`Cargo.toml`** carries the `[package.metadata.whisker]` marker (more
  on that below) and the `include` list.
- **`Package.swift`** *has* to sit at the root: SwiftPM derives a local
  package's identity from its directory name, so a `Package.swift` inside
  `ios/` would make the package identity `ios` and collide with every
  other module. Its target's `path:` points into `ios/Sources/<Module>/`.
- **`build.gradle.kts`** sits at the root for symmetry; its `srcDirs`
  points into `android/src/main/kotlin/`.

## Step 3: Write the Rust API

For a **native view module**, the element is a `#[whisker::module_component]`
fn; imperative methods (if any) go through a hand-written handle wrapping
an [`ElementRef`](/docs/refs):

```rust
use whisker::platform_module::WhiskerValue;
use whisker::{ElementRef, Signal};

// The element you drop into `render!`. The crate-name namespace is
// auto-prepended, so this registers as `whisker-camera:Camera`.
#[whisker::module_component("Camera")]
pub fn camera(facing: Signal<String>, style: Signal<String>) {}

// Typed imperative handle the app holds. `Copy`, so it copies freely
// into `on_tap` closures.
#[derive(Copy, Clone)]
pub struct CameraHandle {
    r: ElementRef,
}

impl CameraHandle {
    pub fn new() -> Self {
        Self { r: ElementRef::new() }
    }
    pub fn r(&self) -> ElementRef {
        self.r // pass to `Camera(ref: …)`
    }
    pub fn capture(&self) {
        let _ = self.r.invoke("capture", vec![]);
    }
}
```

For a **function-shaped module**, dispatch through `module!` and lift the
`WhiskerValue` reply into a typed `Result`. The `module!` macro
auto-prepends the crate name, so the dispatched name matches the
platform-side `Name("…")`:

```rust
use whisker::platform_module::{WhiskerModuleError, WhiskerValue};

pub struct Geocoder;

impl Geocoder {
    pub fn forward(query: String) -> Result<String, WhiskerModuleError> {
        // `module!` prepends this crate's name → `whisker-geocoder:Geocoder`.
        match whisker::module!("Geocoder").invoke("forward", vec![WhiskerValue::String(query)]) {
            WhiskerValue::String(s) => Ok(s),
            WhiskerValue::Error(m) => Err(WhiskerModuleError(m)),
            o => Err(WhiskerModuleError(format!("expected String, got {o:?}"))),
        }
    }
}
```

There are no binding-generating macros: the wire is raw
`Vec<WhiskerValue>`, and the typed wrapper is hand-written so a
conversion mistake surfaces as a loggable `WhiskerValue::Error` rather
than silently producing nothing. The full value model — every variant,
the `From` conversions, `as_error` — is in
[Platform Modules](/docs/platform-modules).

## Step 4: Write the Swift and Kotlin sides

Both platforms author with the same ModuleDefinition DSL (modeled on Expo
Modules). A class subclasses `Module` and overrides `definition()`.
**Subclassing the base is the registration trigger** — the iOS SwiftPM
build plugin and the Android KSP processor walk every concrete `Module`
subclass and emit the Lynx registration for you. There's no companion
marker annotation to keep in sync.

A view module declares a `View(...)` block referencing a `WhiskerUI<View>`
subclass; a function-shaped module omits it and declares module-level
`Function`s instead:

```swift
// ios/Sources/WhiskerCamera/CameraModule.swift
import WhiskerModule    // Module, ModuleDefinition, DSL

public final class CameraModule: Module {
    public override func definition() -> ModuleDefinition {
        ModuleDefinition {
            Name("Camera")
            View(CameraView.self) {
                Prop("facing") { (view: CameraView, value: String) in view.setFacing(value) }
                Function("capture") { (view: CameraView) in view.capture() }
            }
        }
    }
}
```

```kotlin
// android/src/main/kotlin/rs/whisker/modules/whisker_camera/CameraModule.kt
package rs.whisker.modules.whisker_camera

import rs.whisker.runtime.Module        // explicit — else java.lang.Module shadows
import rs.whisker.runtime.ModuleDefinition

class CameraModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("Camera")
        View(CameraView::class.java) {
            Prop("facing") { view: CameraView, value: String -> view.setFacing(value) }
            Function("capture") { view: CameraView -> view.capture() }
        }
    }
}
```

The `Name("…")` here must match the tag in `#[whisker::module_component("Name")]`
(view modules) or the `module!("Name")` call (function modules); the
codegen namespaces both with the crate name identically.

## Step 4.5: Wiring custom events

A view module talks back to Rust by **dispatching a custom event**: the
native view names an event, the Rust element declares an `on_<name>`
prop, and the app passes a closure. This section walks the full
round-trip with first-party code, then two gotchas that bite every
author at least once.

### Reserved event names — the silent swallow

> **⚠️ Never name a custom event after a built-in touch or gesture
> event.** Lynx's native gesture pipeline consumes those names *before*
> the custom-event path runs, so the event is swallowed silently — your
> Rust `on_<name>` handler simply never fires. There is **no error and
> no log**. Renaming to a non-colliding name fixes it instantly.

The reserved set is documented in the Whisker runtime
(`crates/whisker-runtime/src/event.rs`):

> ```text
> [`TouchEvent`] — `tap` / `longpress` / `touchstart` /
> `touchmove` / `touchend` / `touchcancel` / `click`. […]
> [`AnimationEvent`] — `animationstart` / `animationend` / … /
> `transitionend`.
> ```

So the names to **avoid** for a custom event are:

| Family | Reserved names |
|---|---|
| Touch / gesture | `tap`, `longpress`, `touchstart`, `touchmove`, `touchend`, `touchcancel`, `click` |
| Animation | `animationstart`, `animationend`, `transitionend` |

There's a spelling trap here too. Whisker derives the **event name** by
stripping `on_` from the prop, so an `on_long_press` prop dispatches the
name `long_press` — which is *not* spelled the same as Lynx's built-in
`longpress`. Don't rely on that gap: treat the whole touch/gesture/
animation family as off-limits regardless of underscore spelling.

The safe convention is a **module-specific or compound** name that can't
collide with a built-in: `viewer_tap`, `page_changed`, `load`, `menu`,
`message`. Every first-party module follows this — `whisker-webview`
dispatches `load_start` / `navigation` / `message`, `whisker-input`
dispatches `input` / `change` / `submit`.

### A complete round-trip

Take `whisker-input`'s `input` event. Three pieces line up:

**1. Rust — declare the `on_<name>` prop on the thin element.** The
`#[whisker::module_component]` fn lists each event prop typed as the
payload struct that decodes the event body:

```rust
// packages/whisker-input/src/lib.rs
#[whisker::module_component("Input")]
pub fn native_input(
    value: Signal<String>,
    // … other attrs …
    style: Style,
    on_input: InputEvent,
    on_change: InputEvent,
    on_focus: InputEvent,
    on_blur: InputEvent,
    on_submit: InputEvent,
) {
}
```

The payload struct mirrors the event body, with every field
`#[serde(default)]` so a partial body degrades gracefully:

```rust
#[derive(Debug, Clone, Default, serde::Deserialize)]
#[non_exhaustive]
pub struct InputEvent {
    /// The event body's `detail` dict.
    #[serde(default)]
    pub detail: InputDetail,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[non_exhaustive]
pub struct InputDetail {
    /// The field's current full text.
    #[serde(default)]
    pub value: String,
}
```

**2. Swift — list the event, then dispatch it.** The `Events("…")`
block in the module definition is *declaration-only* metadata (so the
codegen/docs scanner sees the full surface); the actual dispatch happens
in the view:

```swift
// packages/whisker-input/ios/Sources/WhiskerInput/InputModule.swift
Events("input", "change", "focus", "blur", "submit")
```

```swift
// packages/whisker-input/ios/Sources/WhiskerInput/InputView.swift
private func emitInput(_ text: String) {
    cachedText = text
    DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        WhiskerCustomEvent.dispatch(from: self, name: "input", params: self.detailPayload(text))
    }
}
```

**3. App — pass a closure to `on_<name>`.** The consuming app hands the
ergonomic component a closure; it receives the decoded payload:

```rust
Input(
    value: value,
    on_input: move |s: String| set_value.set(s.to_uppercase()),
)
```

### Gotcha 1: dispatch on the next runloop tick

Notice the `DispatchQueue.main.async` wrapping the dispatch above. It is
**not** optional. UIKit delegate callbacks (`textFieldDidEndEditing`,
`textViewDidChange`, …) can fire *synchronously during Lynx's native
teardown* — e.g. on a hot-reload remount, while `remove_child` still
holds the renderer's `CURRENT_RENDERER` `RefCell` borrow. A synchronous
dispatch reenters Rust's `dispatch_event`, takes a *second* borrow, and
panics with "RefCell already borrowed" (the event is dropped). Deferring
one tick guarantees the dispatch lands at idle. The canonical comment
from `InputView.swift` spells it out:

```swift
// NOTE: every `WhiskerCustomEvent.dispatch(...)` below is deferred to
// the next main-runloop tick via `DispatchQueue.main.async`. UIKit
// delegate callbacks (`textFieldDidEndEditing`, `textViewDidChange`,
// …) fire SYNCHRONOUSLY during Lynx's native teardown on a hot-reload
// remount, while `remove_child` still holds the `CURRENT_RENDERER`
// RefCell borrow. Dispatching synchronously reenters Rust's
// `dispatch_event` → a second `with_renderer` borrow → "RefCell
// already borrowed" panic (the event is dropped). Deferring one tick
// guarantees the dispatch lands at idle, never inside a render borrow.
```

Snapshot any state (`self`, the text) *before* the async block, capture
`self` weakly, and a torn-down view will simply skip the dispatch.

### Gotcha 2: don't wrap your payload in `detail`

The params dict you hand `dispatch(from:name:params:)` is delivered **as
the event's params**, and Lynx's `generateEventBody` (iOS) / the Android
event reporter already nests that dict under a `detail` key in the event
body — `{ type, target, currentTarget, detail: <params> }`. Your Rust
`InputEvent { detail: { value } }` reads `body.detail`. If you *also*
wrap your payload in a `detail` key yourself, it double-nests
(`detail: { detail: { value } }`) and the typed payload arrives empty —
e.g. every `on_input` delivers `""`. Pass the **flat** dict:

```swift
// packages/whisker-input/ios/Sources/WhiskerInput/InputView.swift
private func detailPayload(_ text: String) -> [AnyHashable: Any] {
    return ["value": text]   // flat — NOT ["detail": ["value": text]]
}
```

## Step 5: Publish — crates.io and nothing else

This is the key distribution fact, and it differs from how the core
runtime ships. **A module's native sources travel on crates.io.** The
generated `Cargo.toml` declares an explicit `include` list that bundles
the Swift and Kotlin sources alongside `src/lib.rs`:

```toml
# whisker-camera/Cargo.toml
include = [
    "Cargo.toml",
    "Package.swift",
    "build.gradle.kts",
    "src/lib.rs",
    "android/**/*.kt",
    "ios/**/*.swift",
    "README.md",
]

# The marker that makes this crate a Whisker module. Its bare presence
# is the signal — no source-file list lives here.
[package.metadata.whisker]
```

When `cargo publish` packs the crate, those `ios/**/*.swift`,
`android/**/*.kt`, `Package.swift`, and `build.gradle.kts` files go with
it:

```sh
cargo publish -p whisker-camera
```

That is the **only** publish step. There is no SwiftPM Registry or Maven
Central step. When a consuming app builds, the Whisker pipeline runs
`cargo metadata`, finds every dependency carrying the
`[package.metadata.whisker]` marker, and reads its native sources
**straight out of the cargo registry extraction** (`~/.cargo/registry/…`).
It wires the iOS package in via `.package(path: …)` and the Android
library in as a Gradle subproject. The two manifests' own `path:` /
`srcDirs` are the source-of-truth for which files compile, so there's no
source list to keep in sync.

> **Contrast: the core runtime.** The Swift/Kotlin runtime every app
> links against is *not* shipped this way — it's a remote SwiftPM package
> (tagged git URL) and Maven AARs. Every module's `Package.swift` points
> at that *same* remote `whisker` package URL so the build graph ends up
> with one shared runtime identity. See
> [Modules & Plugins](/docs/modules-and-plugins) for why.

## Consuming the module

A Whisker app adds the dependency like any other crate:

```toml
# app/Cargo.toml
[dependencies]
whisker-camera = "0.2"
```

```rust
use whisker::prelude::*;
use whisker_camera::{Camera, CameraHandle};

#[whisker::main]
fn app() -> Element {
    let camera = CameraHandle::new();
    render! {
        view(style: "flex-direction: column;") {
            Camera(ref: camera.r(), facing: "back", style: "flex: 1;")
            text(value: "capture", on_tap: move |_| camera.capture())
        }
    }
}
```

No `Podfile`, `Package.swift`, or `build.gradle` edit is needed in the
consuming app — `whisker run ios` and `whisker run android` pick up the
new dependency automatically through the cargo-metadata + host-project
staging step.

## Need native project config too?

If your capability needs a permission, an `Info.plist` key, or a Gradle
dependency before it can run, ship a **plugin** from the same crate —
exactly as `whisker-audio` ships both a `Player` module and a
`WhiskerAudio` plugin for the microphone permission. See
[Authoring a Plugin](/docs/authoring-a-plugin) and, for examples to model
on, [First-party Modules](/docs/modules-api).
