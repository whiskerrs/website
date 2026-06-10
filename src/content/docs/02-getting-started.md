---
title: Getting Started
description: Install the toolchain and run your first Whisker app.
order: 2
---

# Getting Started

This guide walks through installing Whisker and running a starter app on a
simulator or device.

## Prerequisites

- A recent stable **Rust** toolchain (`rustup` recommended)
- **Xcode** (for iOS) and/or **Android Studio** (for Android)

## Install the CLI

```bash
cargo install whisker-cli
```

## Create a project

```bash
whisker new my-app
cd my-app
```

## Run it

```bash
whisker run --ios     # or: whisker run --android
```

The first build sets up the native shell. Subsequent edits hot reload onto the
running app, usually in under a second.

## Next steps

- Learn the view layer in [Writing UI](/docs/writing-ui).
