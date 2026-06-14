---
title: First-party Modules
description: The whisker-image / svg / icons / video / audio / safe-area / local-store crates.
order: 13
---

# API Reference: First-party Modules

Whisker keeps the core small. Native widgets and platform services
ship as separate crates you add to `Cargo.toml` on demand. Each one is
a thin, typed Rust wrapper over a per-platform native module — backed
by iOS and Android implementations, but consumed the same way from your
app code.

All examples assume the prelude is in scope:

```rust
use whisker::prelude::*;
```

These crates live in the Whisker workspace, so a path dependency is the
usual way to depend on them from an example app:

```toml
[dependencies]
whisker-image = "0.2"
```

The crates pair with the rest of the API:
[`#[module_component]`](/docs/macros) generates the native view
components, [`render!`](/docs/macros) mounts them,
[`ReadSignal`](/docs/reactivity-api) carries reactive state, and the
[`ref:`](/docs/refs) pattern binds imperative handles.

| Crate | Provides | Native backing |
|---|---|---|
| `whisker-image` | `Image` component | Kingfisher (iOS) / Coil (Android) |
| `whisker-svg` | `Svg` component + display-list compiler | Custom replayer |
| `whisker-icons` | `Icon` component + `lucide` constants | via `whisker-svg` |
| `whisker-video` | `Video` component + `VideoHandle` | AVPlayer / Media3 ExoPlayer |
| `whisker-audio` | `Player` handle + `WhiskerAudio` plugin | AVPlayer / Media3 ExoPlayer |
| `whisker-safe-area` | `safe_area_insets()` accessor | `UIView` insets / `WindowInsets` |
| `whisker-local-store` | `WhiskerLocalStore` key-value API | `UserDefaults` / `SharedPreferences` |

## `whisker-image`

Networked image component. Loads and caches a remote bitmap directly
from the native module, bypassing Lynx's unimplemented `<image>` stack.

```toml
[dependencies]
whisker-image = "0.2"
```

### `Image`

A pure component (state captured by props, no handle). Declared via
`#[whisker::module_component("Image")]`.

| Prop | Type | Notes |
|---|---|---|
| `src` | `Signal<String>` | Image URL (HTTPS recommended). |
| `mode` | `Signal<ImageMode>` | Content fit. Defaults to `ImageMode::AspectFill`. |
| `style` | `Signal<String>` | Standard inline-style string. Width/height must be set (or via flex). |

All props are reactive: swapping `src` re-fetches and swapping `mode`
re-lays-out without a remount.

### `ImageMode`

`#[non_exhaustive]` enum of content-fit modes.

| Variant | Behavior |
|---|---|
| `AspectFill` | Scale to fill, preserving aspect ratio, cropping the long edge. **Default.** |
| `AspectFit` | Scale to fit inside, preserving aspect ratio, letterboxing the short edge. |
| `ScaleToFill` | Stretch to exactly fill the box, ignoring aspect ratio. |
| `Center` | Render at the source's intrinsic size, centered. |

`ImageMode::as_str()` returns the camelCase wire string, and the enum
implements `Display`.

```rust
use whisker_image::{Image, ImageMode};

render! {
    Image(
        src: "https://example.com/cover.jpg",
        mode: ImageMode::AspectFill,
        style: "width: 240px; height: 240px; border-radius: 8px;",
    )
}
```

## `whisker-svg`

Inline SVG widget. Compiles SVG XML to a display-list byte stream in
Rust, then streams it to a native replayer.

```toml
[dependencies]
whisker-svg = "0.2"
```

### `Svg`

A pure component (declared with `#[component]`, wrapping an internal
`module_component`).

| Prop | Type | Notes |
|---|---|---|
| `content` | `Signal<String>` | SVG XML source. Must contain a top-level `<svg>` with a `viewBox`. Empty string renders nothing. A content swap recompiles + re-renders. |
| `color` | `Signal<String>` | CSS color applied to any `fill="currentColor"` / `stroke="currentColor"` paint. |
| `style` | `Signal<String>` | Standard inline-style string. Width/height MUST be set here (or via flex). |

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

### Advanced: the compiler surface

For callers who want to drive the compiler directly, the crate
re-exports the display-list pipeline:

| Symbol | Purpose |
|---|---|
| `compile` | Compile SVG XML to a `Compiled` display list. Returns `Result<Compiled, CompileError>`. |
| `Compiled` / `CompileError` | The success value (carries `bytes` + `warnings`) and the error type. |
| `Color` / `DisplayListBuilder` / `Transform` | Lower-level builder pieces for constructing a display list by hand. |
| `replay` / `ReplayError` / `Visitor` / `TraceVisitor` | Walk a compiled display list, dispatching ops to a `Visitor`. |

Most apps never touch these — use `Svg` (or [`whisker-icons`](#whisker-icons))
instead.

## `whisker-icons`

Lucide icon set as a Whisker component. Each icon is its own
`pub const &str`, so unreferenced icons are linker-DCE'd from your
binary (tree shaking).

```toml
[dependencies]
whisker-icons = "0.2"
```

### `Icon`

A pure component that forwards to [`whisker_svg::Svg`](#whisker-svg).

| Prop | Type | Notes |
|---|---|---|
| `svg` | `Signal<String>` | The SVG XML to render — usually a `lucide` constant. |
| `color` | `Signal<String>` | CSS color used as the `currentColor` substitution (Lucide draws with `stroke="currentColor"`). |
| `size` | `Signal<String>` | Square edge length. Bare numbers (`"24"`) are treated as `px`; values with a unit (`"1.5em"`, `"100%"`) pass through. |

### `lucide`

A module of ~1700 PascalCase `pub const &str` icon constants
(`Heart`, `ChevronRight`, `Search`, `X`, `AlarmClock`, …), each holding
the full Lucide SVG markup. Reference a constant by name and pass it to
`Icon`'s `svg` prop.

```rust
use whisker_icons::{Icon, lucide};

render! {
    Icon(svg: lucide::Heart, color: "#ff5577", size: "24")
}
```

## `whisker-video`

Video playback element with imperative controls. A native UI element
(`Video`) plus a typed handle (`VideoHandle`) bound on mount via
[`ref:`](/docs/refs).

```toml
[dependencies]
whisker-video = "0.2"
```

### `Video`

Declared via `#[whisker::module_component("Video")]`.

| Prop | Type | Notes |
|---|---|---|
| `src` | `Signal<String>` | Media URL. |
| `style` | `Signal<String>` | Standard layout-styling string. |
| `ref` | `ElementRef` | Pass `handle.r()` to bind a `VideoHandle` on mount. |

### `VideoHandle`

A `Copy` handle wrapping an [`ElementRef`](/docs/refs). Each method
dispatches a fire-and-forget call to the native player.

| Method | Signature | Effect |
|---|---|---|
| `new` | `fn() -> VideoHandle` | Allocate a fresh, unbound handle. |
| `r` | `fn(&self) -> ElementRef` | The `ElementRef` to pass to `Video(ref: …)`. |
| `play` | `fn(&self)` | Start or resume playback from the current position. |
| `pause` | `fn(&self)` | Pause at the current position. |
| `seek` | `fn(&self, position_seconds: f64)` | Seek to an absolute position (seconds; clamped natively). |

`VideoHandle` is `Copy`, so each `move ||` closure captures its own
copy — no `clone()`.

```rust
use whisker_video::{Video, VideoHandle};

let video = VideoHandle::new();

render! {
    view(style: "flex-direction: column;") {
        Video(ref: video.r(), src: "https://example.com/clip.mp4",
              style: "width: 100%; height: 240px;")
        view(style: "flex-direction: row;") {
            text(value: "play",  on_tap: move |_| video.play())
            text(value: "pause", on_tap: move |_| video.pause())
            text(value: "+10s",  on_tap: move |_| video.seek(10.0))
        }
    }
}
```

## `whisker-audio`

View-less audio playback. A `Player` handle drives the engine and
exposes a reactive [`PlaybackStatus`](/docs/reactivity-api) signal. The
crate also ships a plugin that contributes the iOS/Android permission
and background-mode entries.

```toml
[dependencies]
whisker-audio = "0.2"
```

### `Player`

A `Clone` handle (internally `Rc`-counted); the native player releases
when the last clone drops. Methods are fire-and-forget — state changes
surface through `status()`, not return values.

| Method | Signature | Effect |
|---|---|---|
| `new` | `fn(source: impl Into<String>) -> Player` | Construct a player loading from `source` (HTTP/HTTPS or `file://`). |
| `play` | `fn(&self)` | Start or resume playback. |
| `pause` | `fn(&self)` | Pause at the current position. |
| `stop` | `fn(&self)` | Stop and rewind to position 0 (stays loaded). |
| `seek_to` | `fn(&self, position_seconds: f64)` | Seek to an absolute position (seconds; clamped natively). |
| `set_source` | `fn(&self, source: impl Into<String>)` | Replace the loaded media (resets the player; empty string releases the source). |
| `set_volume` | `fn(&self, value: f64)` | Set output gain on `[0.0, 1.0]` (clamped natively). |
| `set_loop` | `fn(&self, looping: bool)` | Loop the source at end-of-media. |
| `status` | `fn(&self) -> ReadSignal<PlaybackStatus>` | Reactive playback status. All clones share one signal. |

### `PlaybackStatus`

`#[non_exhaustive]` snapshot pushed by the native side (times in
seconds). Read fields directly; construct only via the native module.

| Field | Type | Meaning |
|---|---|---|
| `position` | `f64` | Current playback position from the start. |
| `duration` | `f64` | Total media duration. `0.0` while loading or for live streams. |
| `is_loaded` | `bool` | `true` once the source headers are parsed and `duration` is meaningful. |
| `is_playing` | `bool` | `true` while audio is actively playing. |

```rust
use whisker_audio::Player;

let player = Player::new("https://example.com/clip.mp3");
let status = player.status();

render! {
    view(style: "flex-direction: column; padding: 16px;") {
        text(value: computed(move || format!(
            "{:.1}s / {:.1}s",
            status.get().position,
            status.get().duration,
        )))
        view(on_tap: {
            let p = player.clone();
            move |_| p.play()
        }) { text(value: "play") }
    }
}
```

### Plugin: `WhiskerAudio` + `WhiskerAudioConfig`

To record audio or keep playback alive in the background, register the
plugin in `whisker.rs` (see [Configuration](/docs/configuration-api)).
The plugin contributes the matching `Info.plist` /
`AndroidManifest.xml` entries.

| Config field / setter | Type | Effect |
|---|---|---|
| `microphone_permission` | `Option<String>` | Sets `NSMicrophoneUsageDescription` (iOS). Required before `AVAudioSession` can record. |
| `record_audio_android` | `bool` | Appends `android.permission.RECORD_AUDIO` to the Android manifest. Default `false`. |
| `enable_background_recording` | `bool` | Adds `"audio"` to iOS `UIBackgroundModes`. Default `false`. |
| `enable_background_playback` | `bool` | Same `UIBackgroundModes` entry, expressing playback intent. Default `false`. |

```rust
use whisker_audio::WhiskerAudio;

app.plugin::<WhiskerAudio>(|c| c
    .microphone_permission("Record audio clips for podcasts.")
    .record_audio_android(true)
    .enable_background_playback(true));
```

## `whisker-safe-area`

Reactive accessor for the host view's safe-area insets (notch, Dynamic
Island, status bar, home indicator, navigation bar).

```toml
[dependencies]
whisker-safe-area = "0.2"
```

### `safe_area_insets()`

```rust
pub fn safe_area_insets() -> ReadSignal<SafeAreaInsets>
```

Returns a process-global [`ReadSignal`](/docs/reactivity-api) wired to
the native event on first call. Every call hands back the same
underlying signal, so reading from many components is cheap. **Must be
called from the main thread.**

### `SafeAreaInsets`

A `Copy` struct of inset amounts in points (iOS) / dp (Android) — the
same units as Whisker's CSS `px` literals.

| Field | Type | Meaning |
|---|---|---|
| `top` | `f64` | Top inset. |
| `leading` | `f64` | Leading edge (`== left` for LTR). |
| `trailing` | `f64` | Trailing edge (`== right` for LTR). |
| `bottom` | `f64` | Bottom inset. |

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
        // ...
    }
}
```

## `whisker-local-store`

Persistent, string-keyed key-value store. Stateless one-shot operations
namespaced under the unit struct `WhiskerLocalStore`. Backed by
`UserDefaults` (iOS) and `SharedPreferences` (Android); persists across
launches but doesn't sync across devices. For small state — not large
blobs.

```toml
[dependencies]
whisker-local-store = "0.2"
```

### `WhiskerLocalStore`

Associated functions (no instance to construct). Each returns a
`Result<_, WhiskerModuleError>`.

| Method | Signature | Returns |
|---|---|---|
| `save` | `fn(key: String, value: String) -> Result<bool, WhiskerModuleError>` | `true` on success. Overwrites any existing value. |
| `load` | `fn(key: String) -> Result<Option<String>, WhiskerModuleError>` | `Some(value)`, or `None` when no entry exists. |
| `remove` | `fn(key: String) -> Result<(), WhiskerModuleError>` | `Ok(())`. No-op when the key isn't present. |

Call from anywhere the reactive runtime runs — component bodies, event
handlers, or effects.

```rust
use whisker_local_store::WhiskerLocalStore;

let _ = WhiskerLocalStore::save("user_id".into(), "abc".into())?;
let loaded = WhiskerLocalStore::load("user_id".into())?;
// -> Some("abc".to_string())
let _ = WhiskerLocalStore::remove("user_id".into())?;
```
