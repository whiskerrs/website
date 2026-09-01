---
title: How It Works
description: The retained Rust runtime, Host boundary, frame loop, and build pipeline.
order: 11
---

# How It Works

A Whisker app is one native process. Your compiled Rust application is loaded as
a library inside the platform application; Whisker does not start a separate
Rust process or keep an independent game loop running.

The Host creates a runtime instance and drives it in short transactions from its
own event loop. Rust owns UI state and semantics; the Host owns platform
integration and the final pixels.

## From `render!` to a frame

`render!` is authoring syntax over public builders. A declaration such as
`View(style: …) { Text(value: …) }` creates a tree of small `Element` handles.
Reactive properties install effects that update the retained scene when their
signals change.

The frame path is:

```text
component builders
      ↓
retained element scene
      ↓
typed style resolution + Taffy layout
      ↓  Host measurement when intrinsic size is needed
semantic FramePacket
      ↓
platform Host projection and paint
```

Rust is authoritative for the element hierarchy, computed style, layout, input
routing, and frame revisions. A `FramePacket` contains semantic operations and
resolved geometry rather than CSS text or platform object pointers. Hosts apply
the packet transactionally:

- iOS maps elements to UIKit views and platform paint;
- Android maps elements to Android views and platform paint;
- Web maps elements to explicitly positioned DOM nodes;
- Desktop shares a winit/wgpu renderer across macOS, Windows, and Linux code.

Text and custom Host elements may need an intrinsic size before Taffy can finish
layout. Rust batches measurement requests, the Host returns logical sizes, and
the same surface completes layout before producing the final frame.

## Event and idle model

The Host calls the runtime for startup, viewport changes, pointer/touch events,
module events, and animation frames. Event dispatch and signal writes can make
the scene dirty. When Rust-side async completion or reactive work arrives first,
the runtime uses the wake callback supplied at initialization to ask the Host to
schedule another drive.

When nothing is dirty, no animation is active, and no task is ready, the runtime
does not spin. It remains an in-memory object and waits for the next Host call.
Heavy synchronous Rust work therefore blocks the Host UI thread; use
`run_blocking` for blocking work and return the result through the runtime
dispatcher.

## One boundary, two bindings

The core is platform-independent. The boundary branches only at composition:

- **Android and iOS** cross a narrow C-compatible Driver ABI because Kotlin and
  Swift cannot call Rust traits directly. The Host owns callbacks for frame
  presentation, measurement, wake requests, resources, and modules.
- **Web and Desktop** are Rust Hosts. They instantiate `RuntimeInstance` and
  implement the same measurement and frame-sink concepts with ordinary Rust
  calls, avoiding an unnecessary serialization or FFI layer.

`WhiskerValue` is the common recursive value type for module arguments, returns,
properties, and event payloads. Built-in `View` and `Text` use the same element
registration and Host-module model as third-party native elements.

## Build and generated Hosts

`whisker.rs` is the declarative application configuration. Continuous Native
Generation (CNG) turns it and the Cargo dependency graph into `gen/<platform>/`:

```text
whisker.rs + Cargo metadata
           ↓
       whisker-cng
           ↓
gen/android  gen/ios  gen/macos  gen/web
```

The generated tree is a build artifact shared by `whisker run` and `whisker
build`. It contains only the application composition shell; the reusable Host
implementation lives in the platform SDK/library. Android Studio and Xcode can
build their generated projects directly because Gradle/Xcode invoke Whisker's
Rust build adapter as part of the native build graph.

## Development loop

`whisker run <platform>` synchronizes CNG output, performs the initial build,
launches the Host, and watches Rust sources. Function-body changes normally
become subsecond patches applied to the loaded Rust library while component
state remains alive. Dependency, signature, or native-project changes require a
full rebuild and relaunch.

The supported run targets are `android`, `ios`, `web`, and `desktop`. See
[Hot Reload](/docs/hot-reload) for patch rules and the
[CLI Reference](/docs/cli-reference) for exact commands and flags.

## Crates application authors see

Most applications depend only on `whisker` and import
`whisker::prelude::*`. Separate `whisker-*` crates provide routing and native
capabilities. Framework internals are split so that:

- `whisker-runtime` owns reactivity, element handles, runtime instances, tasks,
  events, and module dispatch;
- `whisker-style`, `whisker-layout`, and `whisker-engine` own structured style,
  Taffy layout, retained scenes, measurement, and frame production;
- `whisker-driver` is only the safe mobile FFI adapter;
- platform libraries own Host projection, measurement, input conversion, and
  paint.

That split is why a new Host can be implemented without changing application
components: it supplies the boundary callbacks or Rust traits and consumes the
same protocol.
