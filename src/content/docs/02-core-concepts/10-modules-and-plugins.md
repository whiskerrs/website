---
title: Modules & Plugins
description: Extend runtime capabilities and generated Host projects.
order: 10
---

# Modules & Plugins

Whisker keeps the rendering kernel small and has two extension points with
different responsibilities.

## Modules extend the running application

A **Whisker module** contributes either or both of:

- a Host element, such as a text input, map, video surface, or native toggle;
- a function-shaped Host service, such as storage, haptics, or system status.

The Rust crate owns the typed public API and an element schema. Android, iOS,
Web, and desktop each own an independently compiled Host implementation. The
sides match stable module, element, property, event, and command names at
runtime. This loose baseline means native IDE builds do not depend on generating
Swift or Kotlin contracts from Rust source.

Every value crossing a module boundary is `WhiskerValue`. Built-in `View` and
`Text` use the same element registry and frame protocol as third-party Host
elements; the core does not give custom elements a second-class path.

## Plugins extend project generation

A **plugin** changes the CNG project model before `gen/` is written. It can add
permissions, dependencies, manifest/plist values, files, or native build
settings. Plugins do not run inside the application and should not be used for
runtime calls.

| Need                                  | Use                                   |
| ------------------------------------- | ------------------------------------- |
| Render a native control               | module element                        |
| Call a platform service               | module function                       |
| Receive runtime events from a service | module event                          |
| Add an Android permission             | plugin                                |
| Add an Info.plist value               | plugin                                |
| Add a native build dependency         | module package metadata and/or plugin |

One package may contain both a module and a plugin when it needs runtime code
and project configuration.

## Discovery and linking

Module crates opt in with `[package.metadata.whisker]`. CNG walks the
application's Cargo dependency graph during generation and records the native
packages that the generated Host target must link. Android's Gradle plugin and
iOS Swift Package Manager then use their native dependency systems during a
normal Gradle/Xcode build. Web and desktop Host crates are ordinary optional
Cargo dependencies selected for those targets.

See [Authoring a Module](/docs/authoring-a-module) and
[Authoring a Plugin](/docs/authoring-a-plugin) for implementation details.
