---
title: 3D Scenes
description: Draw lit 3D scenes with whisker-scene, written as components and rendered with wgpu.
order: 11
---

# 3D Scenes

`whisker-scene` is a 3D scene graph for Whisker. You write a scene as
components inside a `SceneView` — cameras, lights, meshes, glTF models —
and the crate draws it with wgpu into a native GPU surface in the
element's box. Every prop is a signal, so scenes update the same way the
rest of your UI does.

Coordinates follow glTF: right-handed, +Y up, in meters.

## Add the dependency

```toml
[dependencies]
whisker-scene = "0.2"
```

The crate draws through `whisker-surface`, which it depends on, so there
is nothing else to add. Scenes render on every Host that `whisker-surface`
supports: iOS, Android, macOS, Windows, Linux, and Web.

Import components and types from the crate root, and vector types from
`whisker_scene::math` (re-exported from `glam`, so you don't need to add
it yourself):

```rust
use whisker::prelude::*;
use whisker_scene::math::{Quat, Vec2, Vec3};
use whisker_scene::{
    DirectionalLight, Geometry, Material, Mesh, PerspectiveCamera, SceneView,
    StandardMaterial,
};
```

## A minimal scene

A scene needs a camera, at least one light, and something to light:

```rust
#[whisker::main]
pub fn app() -> Element {
    let stage = Css::new().height(px(360));

    render! {
        SceneView(style: stage, background: Color::hex(0x1b1d24)) {
            PerspectiveCamera(position: Vec3::new(0.0, 1.5, 4.0), look_at: Vec3::ZERO)
            DirectionalLight(intensity: 2.0, direction: Vec3::new(-0.4, -1.0, -0.6))
            Mesh(
                geometry: Geometry::cuboid(Vec3::splat(1.0)),
                material: Material::Standard(StandardMaterial {
                    base_color: Color::hex(0xe8574f),
                    roughness: 0.45,
                    ..Default::default()
                }),
                rotation: Quat::from_rotation_y(0.6),
            )
        }
    }
}
```

`SceneView` creates the element on screen; give it a size through
`style`. The components inside it (except `SceneAnchor`, below) add a
node to the scene while they stay mounted and remove it on unmount, so
`Show` and your own components work inside a `SceneView` as they do
anywhere else.

Children of `SceneView` and `Group` are rendered by a closure that can
run more than once, so values used inside them must be `Copy` or cloned
at the use site. Geometry, materials, models, `Instances`, and textures
are all cheap to clone, and `Signal::from(value)` makes any of them
`Copy`.

`Group` moves its children together. It and `Mesh` take `position`,
`rotation` (a `Quat`), `scale`, and `visible`.

### Cameras

`PerspectiveCamera` takes `fov_y` (vertical field of view in radians,
default 60°), `near`, `far`, `position`, and `look_at`.
`OrthographicCamera` takes `height` (the visible height in scene units;
the width follows the view's aspect ratio) instead of `fov_y`. Both take
`active`; with several cameras mounted, the last one to become active is
used, which makes switching a matter of toggling a signal:

```rust
let orthographic = signal(false);

render! {
    SceneView(style: stage) {
        PerspectiveCamera(position: eye, look_at: target, active: computed(move || !orthographic.get()))
        OrthographicCamera(height: 3.6, position: eye, look_at: target, active: computed(move || orthographic.get()))
    }
}
```

## Geometry

`Geometry` holds triangle data, uploaded to the GPU once and shared by
every mesh that uses it, so build a shape once (for example
`let sphere = Signal::from(Geometry::sphere(0.45, 48));`) and pass it to
every mesh that needs it.

| Constructor                                                 | Shape                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Geometry::cuboid(size: Vec3)`                              | A box centered on the origin                                                  |
| `Geometry::sphere(radius, segments)`                        | A UV sphere                                                                   |
| `Geometry::plane(size: Vec2)`                               | A rectangle in the XZ plane facing +Y                                         |
| `Geometry::disc(radius, segments)`                          | A circle in the XZ plane facing +Y                                            |
| `Geometry::ring(inner, outer, segments)`                    | A flat ring in the XZ plane                                                   |
| `Geometry::cylinder(radius, height, segments)`              | A capped cylinder along Y                                                     |
| `Geometry::cone(radius, height, segments)`                  | A cone along Y, capped at the base                                            |
| `Geometry::capsule(radius, height, segments)`               | A cylinder with hemispherical ends; `height` includes the ends                |
| `Geometry::torus(radius, tube, segments, tube_segments)`    | A ring-shaped tube lying in the XZ plane                                      |
| `Geometry::extrude(outline: &[Vec2], depth)`                | A polygon of `Vec2::new(x, z)` corners extruded along +Y, capped at both ends |
| `Geometry::tube(path: &[Vec3], radius, sides)`              | An open tube along a polyline                                                 |
| `Geometry::from_vertices(positions, normals, uvs, indices)` | Your own triangles, counter-clockwise from the front                          |

`extrude` accepts concave outlines as long as they don't cross
themselves. `from_vertices` takes `uvs` as an `Option<Vec<Vec2>>` and
panics if the lengths don't match or the index count isn't a multiple of
three.

## Materials

`Material` has three variants.

- `Material::Unlit { color }` — a flat color that ignores lights.
- `Material::Standard(StandardMaterial)` — metallic-roughness PBR, as
  glTF defines it.
- `Material::Custom(CustomMaterial)` — surface inputs computed by your
  own WGSL, lit like a standard material.

### Standard

`StandardMaterial` implements `Default` (white, non-metallic, roughness
0.5), so set only what you need:

```rust
fn standard(color: Color, metallic: f32, roughness: f32) -> Material {
    Material::Standard(StandardMaterial {
        base_color: color,
        metallic,
        roughness,
        ..Default::default()
    })
}
```

| Fields                                                                                                        | Purpose                                                                             |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `base_color`, `metallic`, `roughness`                                                                         | The core PBR inputs; `metallic` and `roughness` in `0.0..=1.0`                      |
| `emissive`, `emissive_intensity`                                                                              | Light the surface gives off; the intensity can exceed what the color holds          |
| `base_color_texture`, `metallic_roughness_texture`, `normal_texture`, `emissive_texture`, `occlusion_texture` | `Option<Texture>` maps, glTF channel layout                                         |
| `texture_transform`                                                                                           | A `TextureTransform { offset, rotation, scale }` applied to every texture           |
| `alpha_mode`                                                                                                  | `AlphaMode::Opaque`, `AlphaMode::Mask(cutoff)`, or `AlphaMode::Blend` (the default) |
| `double_sided`                                                                                                | Draws back faces instead of culling them                                            |
| `clearcoat`, `clearcoat_roughness`                                                                            | A clear glossy layer over the surface                                               |
| `sheen_color`, `sheen_roughness`                                                                              | A soft velvet-like sheen at grazing angles                                          |
| `transmission`, `ior`, `thickness`                                                                            | Light passing through the surface, refracted by `ior`                               |
| `anisotropy`, `anisotropy_rotation`                                                                           | Highlights stretched along or across the tangent                                    |

Textures come from `Texture::decode(bytes)` (PNG, JPEG, or WebP) or
`Texture::from_rgba8(width, height, pixels)`, and are uploaded once and
shared by every material that uses them.

### Custom WGSL

A `MaterialShader` is WGSL source that defines
`fn surface(input: SurfaceInput) -> Surface`. `MaterialShader::new`
checks that it compiles together with the renderer's shader and returns
a `MaterialShaderError` with the compiler's message otherwise. Wrap it
in a `CustomMaterial` and set its `params` and `textures`:

```rust
use whisker_scene::math::Vec4;
use whisker_scene::{CustomMaterial, Material, MaterialShader, Texture};

const GROUND_TINT: &str = "
fn surface(input: SurfaceInput) -> Surface {
    var s = standard_surface(input);
    let grain = textureSample(texture0, material_sampler, input.world.xz * draw.custom[0].w).r;
    s.base_color = vec4(draw.custom[0].rgb * (0.55 + 0.6 * grain), 1.0);
    s.roughness = 0.97;
    s.metallic = 0.0;
    return s;
}
";

fn ground(detail: Texture) -> Material {
    let shader = MaterialShader::new(GROUND_TINT).expect("ground shader");
    let mut material = CustomMaterial::new(shader);
    material.params[0] = Vec4::new(0.35, 0.42, 0.2, 0.5);
    material.textures = vec![detail];
    Material::Custom(material)
}
```

Inside the shader you have:

- `input: SurfaceInput` with `uv`, `world` (the world-space position),
  `normal` (the interpolated vertex normal, facing the viewer), and
  `color` (the vertex color).
- `standard_surface(input)`, which returns the `Surface` a standard
  material would, to start from.
- `draw.custom[0]` to `draw.custom[3]`: the material's four `params`
  (`[Vec4; 4]`).
- `texture0` to `texture4`, sampled with `material_sampler`: the
  material's `textures`, in order. They are read without sRGB decoding.
- `frame.time.x`: seconds since the renderer's first frame.

The returned `Surface` has `base_color` (linear, with alpha),
`emissive`, `metallic`, `roughness`, `normal` (tangent space),
`occlusion`, `clearcoat`, `clearcoat_roughness`, `sheen_color`,
`sheen_roughness`, `transmission`, `ior`, `thickness`, `anisotropy`, and
`anisotropy_direction`.

`CustomMaterial::new` starts with zeroed `params`, no textures,
`alpha_mode: AlphaMode::Opaque`, and `double_sided: false`. Each shader
value is compiled once, so build it once and clone it rather than
calling `MaterialShader::new` per mesh.

## Lights and shadows

| Component          | Props                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `DirectionalLight` | `color`, `intensity`, `direction`, `shadow`                                                    |
| `PointLight`       | `color`, `intensity`, `range`, `position`, `shadow`                                            |
| `SpotLight`        | `color`, `intensity`, `range`, `position`, `direction`, `inner_angle`, `outer_angle`, `shadow` |
| `HemisphereLight`  | `sky_color`, `ground_color`, `intensity`                                                       |
| `AmbientLight`     | `color`, `intensity`                                                                           |

A scene draws up to four directional lights and up to 256 point and
spot lights together. `SpotLight` angles are in radians from the cone's
axis: full light inside `inner_angle`, fading out by `outer_angle`.

Shadows are off until you pass a `Shadow`. Its fields are `map_size`
(texels per side), `cascades` (`1..=4`, for directional lights),
`distance` (how far from the camera directional shadows reach),
`softness`, and `bias`:

```rust
render! {
    DirectionalLight(
        color: Color::hex(0xffdcb0),
        intensity: 2.1,
        direction: Vec3::new(-0.5, -0.8, -0.45),
        shadow: Some(Shadow { map_size: 2048, cascades: 2, distance: 110.0, ..Shadow::default() }),
    )
    HemisphereLight(sky_color: Color::hex(0xb7c6dc), ground_color: Color::hex(0x5d5236), intensity: 0.35)
}
```

All shadows share 16 map layers: each directional cascade takes one, a
spot light one, and a point light six. Lights past that budget cast no
shadow. `Mesh` and `ModelView` take `cast_shadow` and `receive_shadow`
(both default `true`); turning them off on ground cover and distant
scenery saves work.

## Environment lighting

An `Environment` lights and reflects in every surface the light arriving
from all directions (image-based lighting). Pass it to `SceneView`'s
`environment` prop as an `Option<Environment>`, scaled by
`environment_intensity`:

- `Environment::gradient(sky, horizon, ground)` builds a simple sky.
- `Environment::decode(bytes)` reads an equirectangular panorama from a
  Radiance HDR file, or a PNG, JPEG, or WebP read as sRGB.
- `Environment::from_radiance(width, height, pixels)` takes linear
  radiance as `Vec<Vec3>`.

Set `environment_background: true` to draw the environment behind the
scene in place of `background`. Decoding an environment does real work
up front, so build it once rather than in a reactive closure.

## Tone mapping, exposure, and fog

`SceneView` takes `tone_mapping` (`ToneMapping::None` by default,
`Reinhard`, `Aces`, or `AgX`) and `exposure`, which scales lit colors
before tone mapping. `fog` takes an `Option<Fog>`, for example
`fog: Some(Fog::Exponential { color: haze, density: 0.0026 })`.

`Fog::Linear { color, near, far }` rises evenly from no fog at `near` to
full fog at `far`. `Fog::Exponential { color, density }` thickens with
distance. Match the fog color to `background` so the horizon blends.

## Post-processing

`post_processing` takes a `PostProcessing`, where every effect is off
until set:

```rust
render! {
    SceneView(
        style: stage,
        tone_mapping: ToneMapping::AgX,
        exposure: 1.35,
        environment: Some(Environment::gradient(Color::hex(0x9db4cf), Color::hex(0xc8d0d8), Color::hex(0x4d5a35))),
        environment_intensity: 0.8,
        post_processing: PostProcessing {
            bloom: Some(Bloom::default()),
            ambient_occlusion: Some(AmbientOcclusion::default()),
            fxaa: true,
            ..PostProcessing::default()
        },
    ) {
        // ...
    }
}
```

| Field                                         | Effect                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `bloom: Option<Bloom>`                        | Glow from parts brighter than `threshold`; also `intensity`, `radius`               |
| `ambient_occlusion: Option<AmbientOcclusion>` | Darkens creases and corners; `radius`, `intensity`                                  |
| `depth_of_field: Option<DepthOfField>`        | Blurs what lies outside `focus_range` around `focus_distance`; `max_blur` in pixels |
| `color_grading: Option<Texture>`              | A color lookup table applied after tone mapping                                     |
| `fxaa: bool`                                  | Smooths edges multisampling misses, such as inside alpha-masked textures            |

With any effect on, the scene renders to an intermediate image first, so
tone mapping applies to the background too.

## glTF models

`Model::from_slice(bytes)` parses a binary `.glb`, or a `.gltf` whose
buffers and images are embedded as data URIs. Parse a model once;
`ModelView` places a fresh copy each time it mounts, and copies share
geometry and textures:

```rust
use whisker_scene::{AnimationOptions, Model, ModelView};

let lantern = Model::from_slice(include_bytes!("../assets/lantern.glb")).expect("model");

render! {
    ModelView(model: lantern.clone(), position: Vec3::new(-1.1, 0.0, 1.6), scale: Vec3::splat(0.5))
    ModelView(model: lantern.clone(), position: Vec3::new(1.1, 0.0, 1.6), scale: Vec3::splat(0.5))
}
```

`ModelView` takes the same `position`, `rotation`, `scale`, `visible`,
`cast_shadow`, `receive_shadow`, `visible_distance`, and `on_tap` props
as `Mesh`.

### Animations

`model.animations()` lists the clip names in file order (unnamed clips
are `"0"`, `"1"`, and so on). Choose one with `animation`; the model
rests in its default pose while it is `None`:

```rust
let running = signal(false);

render! {
    ModelView(
        model: fox.clone(),
        animation: computed(move || Some(if running.get() { "Run" } else { "Walk" }.to_string())),
        animation_options: AnimationOptions { fade: 0.4, ..AnimationOptions::default() },
    )
}
```

Changing the clip cross-fades from the old one over
`AnimationOptions::fade` seconds. The defaults are `fade: 0.25`,
`looping: true`, and `speed: 1.0`.

## Instancing and distance culling

To draw one mesh many times in a single draw call, pass `instances` an
`Instances` built from `Mat4` transforms, each relative to the mesh's
own:

```rust
use whisker_scene::math::Mat4;
use whisker_scene::Instances;

let trees = Instances::new(positions.iter().map(|p| Mat4::from_translation(*p)).collect());

render! {
    Mesh(
        geometry: cedar,
        material: matte(Color::hex(0x2c4a2e), 0.9),
        instances: Some(trees.clone()),
        cast_shadow: false,
    )
}
```

`visible_distance` on `Mesh`, `ModelView`, and `Group` hides the node
and everything under it while the camera's distance from its origin is
outside a range. Use it to swap detail levels:

```rust
render! {
    Group(visible_distance: Some(0.0..60.0)) {
        // detailed buildings
    }
    Group(visible_distance: Some(60.0..1000.0)) {
        // low-poly stand-ins
    }
}
```

## Taps and raycasting

`Mesh` and `ModelView` take `on_tap`, called with a `SceneHit` when a
tap on the enclosing `SceneView` hits them first:

```rust
render! {
    Mesh(
        geometry: Geometry::plane(Vec2::ONE),
        material: field.clone(),
        instances: Some(plots.clone()),
        on_tap: move |hit: SceneHit| {
            if let Some(index) = hit.instance {
                selected.set(Some(index as usize));
            }
        },
    )
}
```

A `SceneHit` has the `node` that was hit, its `distance` along the ray,
the world-space `point` and `normal`, the `uv`, the `triangle` index,
and, for an instanced mesh, the `instance` index. For a `ModelView`,
`node` is the part of the model that was hit.

A tap is handled by the nearest hit node's `on_tap`, or else the
nearest ancestor that has one. If none does, `SceneView`'s own
`on_tap` runs with `Some(hit)`, or with `None` when the tap hit nothing,
which is a convenient place to clear a selection
(`on_tap: move |hit: Option<SceneHit>| { ... }`).

To pick by hand, `Scene::ray_from_view(point, size)` returns the `Ray`
through a point of a view, and `Scene::raycast(ray)` returns every
visible mesh the ray meets, nearest first.

## UI over the scene

`SceneAnchor` places ordinary UI over a world-space point, such as a
label above an object. Its children are laid out in an absolutely
positioned box whose top-left corner sits on the projected point:

```rust
render! {
    SceneView(style: stage) {
        PerspectiveCamera(position: Vec3::new(0.0, 2.0, 6.0))
        Mesh(geometry: Geometry::sphere(0.06, 12), material: Material::Unlit { color: Color::rgb(255, 200, 150) }, position: position)
        SceneAnchor(position: position) {
            Text(value: "light")
        }
    }
}
```

`position` is in world space, even inside a `Group`. The box is hidden
while the point is behind the camera or outside its near and far range,
and it follows the camera, the view's size, and `position` without
making the scene draw continuously.

## Per-frame updates

A scene redraws only when something in it changes. For animation, call
`use_frame` in a component inside the `SceneView`. Its callback runs at
the start of every frame while the component stays mounted, and receives
the frame with its `timestamp`:

```rust
use whisker_scene::{Group, use_frame};

/// Turns its children around +Y, one revolution every eight seconds.
#[component]
fn turntable(children: Children) -> Element {
    let angle = signal(0.0f32);
    use_frame(move |frame| {
        angle.set(frame.timestamp.as_secs_f32() * std::f32::consts::TAU / 8.0);
    });
    let projected = StoredValue::new(children.clone());
    render! {
        Group(rotation: computed(move || Quat::from_rotation_y(angle.get()))) {
            Fragment { { projected.get()() } }
        }
    }
}
```

The scene draws continuously while any frame callback is registered and
goes back to drawing on change once the last one is gone. A `ModelView`
registers one itself while a clip is playing or fading. To stop
continuous drawing when nothing moves, mount the component that calls
`use_frame` inside a `Show` and unmount it when idle. Animated custom
shaders that read `frame.time.x` also need a frame callback, since time
only advances on frames that are drawn.

`use_frame` and `use_scene` must be called while rendering a component
inside a `SceneView`, not from an event handler; both panic otherwise.

## The imperative API

The components are built on a public tree you can also drive directly.
`use_scene()` returns the `Scene` of the nearest `SceneView`, or create
one with `Scene::new()` and hand it to `SceneView` through `scene`:

```rust
use whisker_scene::{Light, Node, Scene, Transform};

let scene = Scene::new();

let lamp = Node::new();
lamp.set_transform(Transform::from_translation(Vec3::new(0.0, 2.0, 0.0)));
lamp.set_light(Some(Light::Point {
    color: Color::rgb(255, 170, 90),
    intensity: 3.0,
    range: 6.0,
    shadow: None,
}));
scene.root().add_child(&lamp);

render! {
    SceneView(style: stage, scene: scene.clone()) {
        PerspectiveCamera(position: Vec3::new(0.0, 2.0, 6.0))
    }
}
```

A `Node` is a transform with an optional mesh (`set_mesh`), light
(`set_light`), or camera (`set_camera` with a `Projection`), plus
`set_visible`, `set_visible_distance`, `set_cast_shadow`,
`set_receive_shadow`, `set_instances`, and `set_name`. Build the tree
with `add_child`, `insert_child`, and `remove_from_parent`; look nodes
up with `find(name)`. `Model::instantiate()` returns a node tree for a
model, and `AnimationPlayer::new(&root)` plays its clips, with `play`,
`stop`, `seek`, `set_weight`, and an `update(delta)` you call each
frame.

`Scene` also has setters matching the `SceneView` props
(`set_background`, `set_tone_mapping`, `set_fog`, `set_environment`,
`set_post_processing`, and so on), `set_active_camera`, and
`on_frame(callback)`, which keeps the callback registered until the
returned handle is dropped.

## Next steps

- [First-party Modules](/docs/modules-api) — the other optional crates.
- [Imperative Handles](/docs/refs) — binding native elements to Rust
  handles.
