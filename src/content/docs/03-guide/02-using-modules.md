---
title: Using First-party Modules
description: Add images, icons, SVG, video, audio, safe-area, and storage.
order: 2
---

# Using First-party Modules

Whisker keeps the core small. Native widgets and platform services ship
as separate crates you add to `Cargo.toml` on demand — each a thin,
typed Rust wrapper over a per-platform native module that you consume
the same way from app code.

This guide is a set of short recipes: for each crate, what to add to
`Cargo.toml` and a minimal example. For the full prop and method
surface of every module, see the
[First-party Modules reference](/docs/modules-api).

All examples assume the prelude is in scope:

```rust
use whisker::prelude::*;
```

These crates live in the Whisker workspace, so a path dependency is the
usual way to depend on them:

```toml
[dependencies]
whisker-image = { path = "../whisker/packages/whisker-image" }
```

## Images — `whisker-image`

`Image` loads and caches a remote bitmap from the native module
(Kingfisher on iOS, Coil on Android). Set the `mode` prop to control
how the image fits its box.

```toml
[dependencies]
whisker-image = { path = "../whisker/packages/whisker-image" }
```

```rust
use whisker_image::{Image, ImageMode};

render! {
    Image(
        src: "https://example.com/cover.jpg",
        mode: ImageMode::AspectFill,
        style: "width: 240px; height: 240px; border_radius: 8px;",
    )
}
```

`mode` defaults to `ImageMode::AspectFill`. The other variants are
`AspectFit`, `ScaleToFill`, and `Center`. All props are reactive —
swap `src` to re-fetch, swap `mode` to re-lay-out without a remount.
Width and height must be set (here via `style`, or let flex size it).

## Icons — `whisker-icons`

`Icon` renders a Lucide icon. Each icon is its own `pub const &str`
holding the full SVG markup, under the `lucide` module — so unused
icons are stripped from your binary by the linker.

```toml
[dependencies]
whisker-icons = { path = "../whisker/packages/whisker-icons" }
```

```rust
use whisker_icons::{Icon, lucide};

render! {
    Icon(svg: lucide::Heart, color: "#ff5577", size: "24")
}
```

Reference any of the ~1700 PascalCase constants by name
(`lucide::ChevronRight`, `lucide::Search`, `lucide::X`, …). `color` is
substituted for `currentColor` (Lucide draws with
`stroke="currentColor"`). `size` is the square edge length — a bare
number like `"24"` is treated as `px`; a value with a unit (`"1.5em"`,
`"100%"`) passes through.

## Inline SVG — `whisker-svg`

`Svg` renders arbitrary SVG XML. It compiles the markup to a
display-list byte stream in Rust and streams it to a native replayer.

```toml
[dependencies]
whisker-svg = { path = "../whisker/packages/whisker-svg" }
```

```rust
use whisker_svg::Svg;

render! {
    Svg(
        content: r#"<svg viewBox="0 0 24 24">
            <path d="M 5 12 L 10 17 L 19 7"
                  stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>"#,
        color: "#1d9bf0",
        style: "width: 24px; height: 24px;",
    )
}
```

The `content` must contain a top-level `<svg>` with a `viewBox`; an
empty string renders nothing. `color` replaces any
`fill="currentColor"` / `stroke="currentColor"` paint. As with `Image`,
width and height must be set via `style` (or flex).

## Video — `whisker-video`

`Video` is a native playback element (AVPlayer / Media3 ExoPlayer)
with imperative controls. You drive play/pause/seek through a
`VideoHandle`, bound to the element on mount via the
[`ref:`](/docs/refs) pattern.

```toml
[dependencies]
whisker-video = { path = "../whisker/packages/whisker-video" }
```

```rust
use whisker_video::{Video, VideoHandle};

let video = VideoHandle::new();

render! {
    view(style: "flex_direction: column;") {
        Video(
            ref: video.r(),
            src: "https://example.com/clip.mp4",
            style: "width: 100%; height: 240px;",
        )
        view(style: "flex_direction: row;") {
            text(value: "play",  on_tap: move |_| video.play())
            text(value: "pause", on_tap: move |_| video.pause())
            text(value: "+10s",  on_tap: move |_| video.seek(10.0))
        }
    }
}
```

Create the handle with `VideoHandle::new()`, pass `video.r()` to the
element's `ref:` prop, then call `play()`, `pause()`, or
`seek(seconds)` from any handler. `VideoHandle` is `Copy`, so each
`move ||` closure captures its own copy — no `clone()` needed.

## Audio — `whisker-audio`

`Player` is a view-less audio engine (AVPlayer / Media3 ExoPlayer). It
drives playback and exposes a reactive `PlaybackStatus` signal — there
is no element to mount.

```toml
[dependencies]
whisker-audio = { path = "../whisker/packages/whisker-audio" }
```

```rust
use whisker_audio::Player;

let player = Player::new("https://example.com/clip.mp3");
let status = player.status();

render! {
    view(style: "flex_direction: column; padding: 16px;") {
        text(value: move || format!(
            "{:.1}s / {:.1}s",
            status.get().position,
            status.get().duration,
        ))
        view(on_tap: {
            let p = player.clone();
            move |_| p.play()
        }) {
            text(value: "play")
        }
    }
}
```

Construct with `Player::new(source)` (HTTP/HTTPS or `file://`). The
methods (`play`, `pause`, `stop`, `seek_to`, `set_source`,
`set_volume`, `set_loop`) are fire-and-forget — state surfaces through
the `status()` signal, not return values. `Player` is `Clone`
(`Rc`-backed); every clone shares the same native player and the same
status signal, so the example clones the handle into the tap closure.

### Permissions and background mode

To record audio or keep playback alive in the background, register the
crate's `WhiskerAudio` plugin in your `whisker.rs`. The plugin
contributes the matching `Info.plist` / `AndroidManifest.xml` entries:

```rust
// whisker.rs
pub fn configure(app: &mut whisker_config::Config) {
    app.name("Podcast")
        .bundle_id("rs.whisker.podcast");

    app.plugin::<whisker_audio::WhiskerAudio>(|c| {
        c.microphone_permission("Record clips for podcast episodes.")
            .record_audio_android(true)
            .enable_background_playback(true);
    });
}
```

| Setter | Effect |
|---|---|
| `microphone_permission(text)` | Sets `NSMicrophoneUsageDescription` (iOS) |
| `record_audio_android(true)` | Adds `android.permission.RECORD_AUDIO` |
| `enable_background_recording(true)` | Adds `"audio"` to iOS `UIBackgroundModes` |
| `enable_background_playback(true)` | Same `UIBackgroundModes` entry, for playback |

See [Configuration](/docs/configuration-api) for the `whisker.rs`
file and how plugins are registered.

## Safe-area insets — `whisker-safe-area`

`safe_area_insets()` returns a reactive `ReadSignal<SafeAreaInsets>`
for the host view's insets (notch, Dynamic Island, status bar, home
indicator, navigation bar). Read it inside a reactive style to pad your
layout around the unsafe edges.

```toml
[dependencies]
whisker-safe-area = { path = "../whisker/packages/whisker-safe-area" }
```

```rust
use whisker_safe_area::safe_area_insets;

let insets = safe_area_insets();
let outer_style = move || {
    let i = insets.get();
    format!(
        "padding-top: {}px; padding-bottom: {}px; \
         padding-left: {}px; padding-right: {}px;",
        i.top, i.bottom, i.leading, i.trailing,
    )
};

render! {
    view(style: outer_style()) {
        // your content
    }
}
```

The struct fields are `top`, `bottom`, `leading`, and `trailing`
(`leading == left`, `trailing == right` for LTR), in points (iOS) / dp
(Android) — the same units as Whisker's CSS `px` literals. Every call
hands back the same process-global signal, so reading it from many
components is cheap. **Call it from the main thread.**

## Local storage — `whisker-local-store`

`WhiskerLocalStore` is a persistent, string-keyed key-value store
(`UserDefaults` on iOS, `SharedPreferences` on Android). It's for small
state — not large blobs — and persists across launches but doesn't sync
across devices.

```toml
[dependencies]
whisker-local-store = { path = "../whisker/packages/whisker-local-store" }
```

```rust
use whisker_local_store::WhiskerLocalStore;

// save / load / remove are associated functions — no instance to build.
let _ = WhiskerLocalStore::save("user_id".into(), "abc".into())?;

let loaded = WhiskerLocalStore::load("user_id".into())?;
// -> Some("abc".to_string())

let _ = WhiskerLocalStore::remove("user_id".into())?;
```

Each call returns a `Result` (`save` yields `bool`, `load` yields
`Option<String>`, `remove` yields `()`). Call from anywhere the
reactive runtime runs — component bodies, event handlers, or effects.

## Next steps

- [First-party Modules reference](/docs/modules-api) — the complete
  prop and method surface of every crate above.
- [Configuration](/docs/configuration-api) — registering plugins in
  `whisker.rs`.
- [Imperative & Refs](/docs/refs) — the `ref:` pattern that binds
  handles like `VideoHandle`.
