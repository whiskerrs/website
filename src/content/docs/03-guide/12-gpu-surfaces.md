---
title: GPU Surfaces
description: Draw with wgpu, or any other graphics API, into an element of a Whisker layout.
order: 12
---

# GPU Surfaces

Two crates let you draw GPU content inside a Whisker layout:

- `whisker-surface` gives an element a native render target and
  display-synchronized frames. It does not draw, and it does not depend on
  any graphics API.
- `whisker-wgpu` draws into those targets with [wgpu](https://wgpu.rs),
  sharing one device and queue across every surface in the app.

Use them when an element has to show something you render yourself: a
custom chart, a shader effect, a game view, a 3D viewport. The surface is an
ordinary element, so it takes a `style`, sits in flex layout, and can have
Whisker UI on top of it. `whisker-scene` (3D scenes) and `whisker-map` are
built on these two crates.

Most apps use both crates together, and that is what the first part of this
page covers. [Using another graphics API](#using-another-graphics-api)
describes `whisker-surface` on its own.

## Add the dependencies

```toml
[dependencies]
whisker-surface = "0.1"
whisker-wgpu = "0.1"
```

`whisker-surface` provides the `SurfaceView` element; `whisker-wgpu` turns a
renderer into a surface. `whisker-wgpu` re-exports the wgpu version it is
built against as `whisker_wgpu::wgpu`. Import wgpu from there so your types
match the crate's.

## Supported platforms

| Host        | Native target                             | wgpu backend                              |
| ----------- | ----------------------------------------- | ----------------------------------------- |
| iOS (13+)   | `CAMetalLayer`                            | Metal                                     |
| macOS (14+) | `CAMetalLayer`                            | Metal                                     |
| Android     | `ANativeWindow` backed by a `TextureView` | Vulkan, falling back to GLES              |
| Web         | `<canvas>`                                | WebGPU, falling back to WebGL             |
| Windows     | DirectComposition surface handle          | DX12                                      |
| Linux (GTK) | dmabuf sink (takes finished frames)       | Vulkan, exported as dmabuf or copied back |

Frames are paced by the platform's display callback: `CADisplayLink` on
iOS and macOS, `Choreographer` on Android, `requestAnimationFrame` on the
Web, and GTK's tick callback on Linux.

On Linux the Host cannot hand out a window, so `whisker-wgpu` renders to its
own `Rgba8UnormSrgb` textures and passes them to GTK as dmabufs. When the
driver or the Host cannot share the buffer, it copies each frame back to the
CPU instead and logs the reason.

## Draw with wgpu

A renderer implements `whisker_wgpu::Renderer`:

```rust
pub trait Renderer: 'static {
    fn resize(&mut self, _gpu: &Gpu, _size: SurfaceSize) {}
    fn render(&mut self, gpu: &Gpu, target: &wgpu::TextureView, frame: FrameInfo);
}
```

- `render` records and submits the commands for one frame into `target`.
  `whisker-wgpu` acquires the texture before the call and presents it
  afterwards, so `render` only needs to `queue.submit` its work.
- `resize` is optional. It receives a `SurfaceSize`, whose `width` and
  `height` are in physical pixels and whose `scale` is the number of
  physical pixels per logical pixel. It is called once before the first
  frame and again whenever the element's size or scale changes.
- `FrameInfo` has a single field, `timestamp`, the monotonic Host time of
  the frame as a `Duration`.

`whisker_wgpu::surface` takes a closure that builds the renderer and returns a
`Surface` for the `SurfaceView` element:

```rust
pub fn surface<R: Renderer>(
    create: impl FnOnce(&Gpu, wgpu::TextureFormat) -> R + 'static,
) -> Surface
```

The closure runs once, when the surface first connects to the GPU, and
receives the shared `Gpu` and the texture format of the target. Create your
pipelines for that format.

Here is a complete app that clears its surface to a color that changes over
time, with a button that pauses and resumes drawing:

```rust
use whisker::prelude::*;
use whisker::runtime::view::Element;
use whisker_surface::{FrameInfo, SurfaceView};
use whisker_wgpu::{Gpu, Renderer, wgpu};

struct Pulse;

impl Renderer for Pulse {
    fn render(&mut self, gpu: &Gpu, target: &wgpu::TextureView, frame: FrameInfo) {
        let t = frame.timestamp.as_secs_f64();
        let mut encoder = gpu.device.create_command_encoder(&Default::default());
        {
            let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("pulse"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: target,
                    depth_slice: None,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.5 + 0.5 * t.sin(),
                            g: 0.2,
                            b: 0.4,
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                ..Default::default()
            });
        }
        gpu.queue.submit([encoder.finish()]);
    }
}

#[whisker::main]
pub fn app() -> Element {
    let running = signal(true);
    let surface = whisker_wgpu::surface(|_gpu, _format| Pulse);
    surface.set_continuous(true);
    let toggle = surface.clone();

    render! {
        View(style: css!(flex_grow: 1.0, flex_direction: FlexDirection::Column)) {
            SurfaceView(
                surface: surface,
                style: css!(width: percent(100), height: px(300)),
            )
            View(on_tap: move |_| {
                let next = !running.get_untracked();
                running.set(next);
                toggle.set_continuous(next);
            }) {
                Text(value: computed(move || {
                    if running.get() { "Pause".to_string() } else { "Resume".to_string() }
                }))
            }
        }
    }
}
```

Give the `SurfaceView` a width and height through `style` or flex; it has
no intrinsic size. `Surface` is `Clone` and reference-counted, so clone it
for every closure that needs it, as with `toggle` above.

The `packages/whisker-wgpu/example` app in the Whisker repository is a
fuller version: a spinning triangle with a uniform buffer and a render
pipeline, under a Whisker label.

### Texture formats

`whisker-wgpu` picks an sRGB format when the target offers one. On WebGPU,
where canvases only offer UNORM formats, the `TextureView` passed to
`render` is an sRGB view of the canvas texture, and the `format` given to
your `create` closure is that sRGB format.

Some targets have no sRGB format at all, such as GLES on Android. Check
`format.is_srgb()` in `create` and, when it is false, write colors that are
already sRGB-encoded from your shaders.

## On-demand and continuous frames

A surface does not redraw on every display refresh by default. Frames are
delivered:

- once after the target is created,
- once after each resize,
- once after each call to `Surface::request_frame()`,
- on every display refresh while `Surface::set_continuous(true)` is on.

When no frame is pending and continuous mode is off, the Host stops its
display callback, so an idle surface costs nothing.

Use `request_frame` for content that changes in response to events: data
arriving, a gesture, a signal change. A common pattern is an `effect` that
reads the signals your renderer depends on and requests a frame:

```rust
let color = signal(0u32);
let surface = whisker_wgpu::surface(move |gpu, format| Swatch::new(gpu, format, color));
let redraw = surface.clone();
effect(move || {
    let _ = color.get();
    redraw.request_frame();
});
```

Here `Swatch` is your renderer, reading `color` in `render`.
Several `request_frame` calls before the next display refresh produce a
single frame.

Use `set_continuous(true)` for animation, and turn it off when the
animation ends.

## The shared device

Every surface in the app draws with the same `Gpu`:

```rust
#[derive(Clone, Debug)]
pub struct Gpu {
    pub instance: wgpu::Instance,
    pub adapter: wgpu::Adapter,
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
}
```

Textures, buffers, and pipelines created on `gpu.device` can be used by any
surface, so several views of the same data can share their GPU resources.

The device is opened lazily the first time a surface connects. To use it
outside a renderer, for example to upload data ahead of time or to show the
adapter name, call `whisker_wgpu::gpu()`:

```rust
let adapter = resource(|| async {
    let gpu = whisker_wgpu::gpu().await.map_err(|error| error.to_string())?;
    let info = gpu.adapter.get_info();
    Ok(format!("{} ({:?})", info.name, info.backend))
});
```

`gpu()` returns `Result<Gpu, GpuError>`. `GpuError` has two variants,
`RequestAdapter` and `RequestDevice`, wrapping the corresponding wgpu
errors. A failed attempt is retried by the next call.

On Android and the Web, the adapter is chosen through a window (GLES and
WebGL need one), so there `gpu()` resolves only once the first surface
has connected.

The device is opened with wgpu's `downlevel_webgl2_defaults` limits (with
texture size limits raised to what the adapter supports) and no optional
features, so the same renderer runs on every backend. Do not rely on
features or limits beyond those.

## Surface lifecycle

All `Renderer` and delegate calls happen on the main thread.

1. **Attach.** When the element is on screen and has a non-zero size, the
   Host creates the native target. `whisker-wgpu` connects it to the shared
   device, configures it, calls your `create` closure (the first time
   only), calls `resize`, and requests a frame.
2. **Resize.** When the element's pixel size or scale changes,
   `whisker-wgpu` reconfigures the target, calls `resize`, and a frame
   follows.
3. **Detach.** When the target goes away (the element is removed, or the
   Host recreates its target, for example when an Android app is
   backgrounded), the wgpu surface is dropped.
4. **Reattach.** When the Host provides a new target, `whisker-wgpu`
   connects it again. The renderer you created is kept, so the `create`
   closure does not run again; `resize` is called and a new frame is
   requested.

Your renderer therefore lives as long as the `Surface`, not as long as one
native target. Keep GPU resources in the renderer and they survive the app
going to the background.

If the target reports that it is outdated or lost when a frame starts,
`whisker-wgpu` reconfigures it and skips that frame. Errors while
connecting are logged (to logcat under the tag `WhiskerWgpu` on Android, to
the browser console on the Web, to stderr elsewhere) rather than returned.

## Wheel events

`SurfaceView` takes an optional `on_wheel` handler. When it is set, mouse
wheel and trackpad scrolls over the element go to the handler instead of
scrolling the page:

```rust
use whisker_surface::{SurfaceView, WheelEvent};

render! {
    SurfaceView(
        surface: surface,
        style: css!(width: percent(100), height: px(300)),
        on_wheel: move |event: WheelEvent| {
            let d = event.detail;
            zoom_by(d.delta_y, d.x, d.y, d.ctrl_key);
        },
    )
}
```

`WheelEvent::detail` is a `WheelDetail` with `x` and `y` (the pointer
position in the element, in logical pixels), `delta_x` and `delta_y` (the
scroll distance in logical pixels, positive to the right and down), and
`ctrl_key` (set for a trackpad pinch, which browsers report as a wheel
event with Control held). Only the Web Host reports wheel events.

## Using another graphics API

Without `whisker-wgpu`, you implement `SurfaceDelegate` yourself and build
the `Surface` with `Surface::new`:

```rust
pub trait SurfaceDelegate: 'static {
    fn created(&mut self, target: NativeSurface, size: SurfaceSize);
    fn resized(&mut self, size: SurfaceSize);
    fn frame(&mut self, frame: FrameInfo);
    fn destroyed(&mut self);
}
```

```rust
use whisker_surface::{FrameInfo, NativeSurface, Surface, SurfaceDelegate, SurfaceSize, SurfaceView};

struct MyRenderer { /* swapchain, device, ... */ }

impl SurfaceDelegate for MyRenderer {
    fn created(&mut self, target: NativeSurface, size: SurfaceSize) { /* create a swapchain */ }
    fn resized(&mut self, size: SurfaceSize) { /* resize it */ }
    fn frame(&mut self, frame: FrameInfo) { /* draw and present */ }
    fn destroyed(&mut self) { /* release everything that references the target */ }
}

let surface = Surface::new(MyRenderer { /* ... */ });
surface.set_continuous(true);

render! {
    SurfaceView(surface: surface, style: css!(width: percent(100), height: px(300)))
}
```

Call `Surface::new` from a component body or anywhere else the Whisker
runtime is current. The rules:

- `created` hands you the target and its size. The target stays valid
  until `destroyed` returns.
- `created` is called again after each `destroyed` when the Host recreates
  its target, for example on Android resume.
- Everything that references the target must be released before
  `destroyed` returns.
- `frame` follows the same on-demand and continuous rules as above.

The delegate is owned by the `Surface`. If it needs to call
`request_frame` on its own surface, store a `WeakSurface` from
`Surface::downgrade()` and call `upgrade()` when needed; a strong
`Surface` inside its own delegate would never be dropped.

### Native targets

`NativeSurface` is a `#[non_exhaustive]` enum, so match it with a fallback
arm:

| Variant                                 | Host       | Contents                                        |
| --------------------------------------- | ---------- | ----------------------------------------------- |
| `CoreAnimationLayer(NonNull<c_void>)`   | iOS, macOS | A `CAMetalLayer`                                |
| `AndroidNativeWindow(NonNull<c_void>)`  | Android    | An `ANativeWindow`                              |
| `WebCanvas(web_sys::HtmlCanvasElement)` | Web        | The canvas element (only on `wasm32`)           |
| `DCompSurfaceHandle(NonNull<c_void>)`   | Windows    | A handle from `DCompositionCreateSurfaceHandle` |
| `Dmabuf(DmabufSink)`                    | Linux      | A sink for finished frames (only on Linux)      |

The Host sets the layer's drawable size on iOS and macOS. On Android
`whisker-surface` holds a reference to the `ANativeWindow` until the target
is destroyed; you do not need to acquire or release it.

### Linux: presenting frames

The Linux Host does not give you a window. Instead, `DmabufSink` takes
frames you have already finished rendering:

- `present(frame: DmabufFrame) -> bool` shows a frame in GPU memory. It
  returns `false` when the Host cannot import it.
- `modifiers(fourcc: u32) -> Vec<u64>` lists the DRM format modifiers the
  Host can import for a format.
- `present_pixels(width, height, stride, pixels: &[u8])` shows premultiplied
  RGBA8 pixels copied from the GPU, as a fallback.

A `DmabufFrame` has `width`, `height`, `fourcc` (a DRM fourcc code),
`modifier`, `planes: Vec<DmabufPlane>`, and `release`, an optional
`Box<dyn FnOnce() + Send>` that the Host calls, possibly on another thread,
once it no longer reads the buffer. Each `DmabufPlane` has an owned `fd`,
an `offset`, and a `stride`. The renderer must have finished writing the
frame before calling `present`.
