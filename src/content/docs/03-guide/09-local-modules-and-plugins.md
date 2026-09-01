---
title: Local Modules & Plugins
description: Keep app-private native extensions inside the Cargo workspace.
order: 9
---

# Local Modules & Plugins

An app-private module has the same shape as a published module. Put it in the
workspace and add an ordinary path dependency:

```text
my-app/
├── Cargo.toml
├── app/
│   ├── Cargo.toml
│   └── src/lib.rs
└── modules/
    └── camera/
        ├── Cargo.toml
        ├── src/lib.rs
        ├── android/
        ├── ios/
        ├── desktop/
        └── web/
```

```toml
[dependencies]
camera = { path = "../modules/camera" }
```

The module manifest still needs the discovery marker:

```toml
[package.metadata.whisker]
```

Regenerate after adding, removing, or moving a module dependency:

```sh
whisker run android
# or explicitly regenerate through the normal build/run workflow
```

CNG owns dependency-graph discovery. A clean checkout therefore needs a
generation step before opening the generated Xcode or Gradle project, just as
it does after changing app configuration. Once generated, Xcode/Gradle perform
the actual native compilation and linking without a surrounding `whisker run`
process.

Use the same `whisker new-module` scaffold and APIs documented in
[Authoring a Module](/docs/authoring-a-module). Do not place Host declarations
inside the app's `src/lib.rs`; keeping them in a module crate lets every target
select only its own implementation.

Local plugins likewise use an ordinary path dependency. They mutate CNG's
project IR during generation and must not contain runtime application logic.
