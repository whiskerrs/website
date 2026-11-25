---
title: Maps
description: Show interactive vector maps from MapLibre styles with whisker-map.
order: 13
---

# Maps

`whisker-map` is a vector map engine for Whisker. It loads a
[MapLibre style](https://maplibre.org/maplibre-style-spec/), fetches and
decodes the tiles itself, and draws them with wgpu into a GPU surface.
There is no platform map SDK underneath, so the same style renders the
same way on every Host.

## Add the dependency

```toml
[dependencies]
whisker-map = "0.1"
serde_json = "1"
```

`serde_json` is needed as soon as you add sources or layers from code:
`MapRef` takes style JSON as `serde_json::Value`, and the crate does not
re-export it.

The map draws through `whisker-surface` and `whisker-wgpu`, so it runs
wherever those have a render target: iOS and macOS (a `CAMetalLayer`),
Android, Windows, Linux, and the web (WebGL; tile decoding runs in Web
Workers there).

## A minimal map

`MapView` takes a style, a camera signal, and a `style:` that gives it a
size. Components placed inside it, such as `Marker`, are laid over the
map.

```rust
use whisker::prelude::*;
use whisker_map::{LatLng, MapCamera, MapStyle, MapView, Marker};

const TOKYO_STATION: LatLng = LatLng::new(35.6812, 139.7671);

#[whisker::main]
fn app() -> Element {
    let camera = signal(MapCamera {
        center: TOKYO_STATION,
        zoom: 13.0,
        ..Default::default()
    });
    render! {
        MapView(
            map_style: MapStyle::Url("https://tiles.openfreemap.org/styles/liberty".into()),
            camera: camera,
            style: css!(flex_grow: 1.0),
        ) {
            Marker(position: TOKYO_STATION) {
                View(style: css!(width: px(18), height: px(18), border_radius: px(9)))
            }
        }
    }
}
```

`MapView` props:

| Prop             | Type                         | Notes                                               |
| ---------------- | ---------------------------- | --------------------------------------------------- |
| `map_style`      | `MapStyle`                   | Read once, when the map mounts.                     |
| `camera`         | `RwSignal<MapCamera>`        | Two-way; see [Camera](#camera).                     |
| `gestures`       | `bool`                       | Defaults to `true`. Read once, when the map mounts. |
| `style`          | `Style`                      | Give the map a size, as with any GPU surface.       |
| `on_tap`         | `Option<TapCallback>`        | See [Events](#events).                              |
| `on_move_end`    | `Option<EventCallback>`      |                                                     |
| `on_idle`        | `Option<EventCallback>`      |                                                     |
| `on_source_data` | `Option<SourceDataCallback>` |                                                     |
| `map_ref`        | `Option<MapRef>`             | See [The MapRef handle](#the-mapref-handle).        |

## Styles and sources

`MapStyle` has two variants:

- `MapStyle::Url(String)` — the address of a MapLibre `style.json`.
  Relative URLs inside it (sources, sprites, glyphs) resolve against it.
- `MapStyle::Json(String)` — a style document as a string.

Source types the engine reads:

| Source `type` | What it takes                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `vector`      | Mapbox Vector Tiles from `tiles` templates, a TileJSON `url`, or a `pmtiles://` archive                                          |
| `raster`      | PNG, JPEG or WebP tiles; `tileSize` defaults to 512                                                                              |
| `raster-dem`  | Elevation tiles for `hillshade` layers, Mapbox or `"encoding": "terrarium"`                                                      |
| `geojson`     | Inline GeoJSON or a URL, with `cluster`, `clusterRadius`, `clusterMaxZoom`, `clusterMinPoints`, `maxzoom`, `tolerance`, `buffer` |

Tile URL templates accept `{z}`, `{x}`, `{y}`, `{-y}` and `{quadkey}`,
and `"scheme": "tms"`. A source `url` of the form
`pmtiles://https://…` (or `pmtiles://file://…`) reads a PMTiles v3
archive by byte range; archives compressed with anything other than
gzip (or nothing) are rejected. Off the web, `file://` URLs read local
files.

Layer types drawn: `background`, `fill`, `line` (including
`line-gradient`), `circle`, `symbol` (text from the style's `glyphs`,
icons from its `sprite`), `raster`, `hillshade`, and `fill-extrusion`.
The style's `projection` (`globe`) and `light` are read.

Not supported in 0.1.0:

- `heatmap` layers and `image` sources are parsed but not drawn.
- Layers whose `fill-pattern`, `line-pattern` or
  `fill-extrusion-pattern` varies per feature are skipped.
- Unknown layer types (such as `sky`) and source types are dropped.
- The style's `terrain` key is not read; `raster-dem` only feeds
  `hillshade`.

## Camera

`MapCamera` is where the map looks from:

```rust
pub struct MapCamera {
    pub center: LatLng,
    pub zoom: f64,    // MapLibre zoom: the world is 512 logical px across at 0
    pub bearing: f32, // degrees clockwise from north
    pub pitch: f32,   // degrees away from looking straight down
}
```

`MapCamera::default()` is centered on `LatLng::new(0.0, 0.0)` at zoom

1. The map clamps what it is given: zoom to `MAX_ZOOM` (24) and down to
   0 in Mercator or `MIN_ZOOM` (-2) on the globe, pitch to 0 through
   `MAX_PITCH` (85).

The `camera` signal always goes both ways; there is no separate
uncontrolled mode:

- Gestures and animations write the camera back into the signal, so
  reading it gives the current view.
- Writing the signal jumps the map there and cancels any running motion.

```rust
render! {
    Text(value: computed(move || {
        let c = camera.get();
        format!("{:.4}, {:.4}  z{:.2}", c.center.lat, c.center.lng, c.zoom)
    }))
}
```

To animate instead of jumping, use `fly_to` or `ease_to` on a
[`MapRef`](#the-mapref-handle):

```rust
use std::time::Duration;

map_ref.fly_to(MapCamera { center: TOKYO_STATION, zoom: 15.0, ..Default::default() });

let mut target = camera.get_untracked();
target.pitch = 60.0;
target.bearing = -30.0;
map_ref.ease_to(target, Duration::from_millis(800));
```

`fly_to` zooms out and back in along MapLibre's `flyTo` path, taking
longer for longer distances. `ease_to` moves along an ease-in-out curve
for the `Duration` you give.

### Projection

A style that asks for `"projection": {"type": "globe"}` is drawn as a
globe that flattens into Mercator as you zoom in. Override it from code
with `map_ref.set_projection(MapProjection::Globe)` or
`MapProjection::Mercator`; the app's choice wins over the style's.

## Gestures

With `gestures: true` (the default), the map handles touch and mouse
input itself:

- One-finger or left-button drag pans, and a fast release flings.
- Double tap zooms in one level around the tap.
- Two fingers pinch to zoom and pan; turning them past a few degrees
  also rotates.
- Two side-by-side fingers dragged vertically together change the pitch.
- Right-button mouse drag rotates (horizontal) and pitches (vertical).
- Mouse wheel and trackpad pinch zoom around the pointer.

Any new gesture stops a running `fly_to` or `ease_to`. With
`gestures: false` the camera only moves from code, but `on_tap` is still
called.

## Events

```rust
use whisker_map::{MapSourceData, MapTap};

let tapped = signal(String::new());
let on_tap = move |tap: MapTap| {
    if let Some(place) = tap.position {
        tapped.set(format!("{:.4}, {:.4}: {} features", place.lat, place.lng, tap.features.len()));
    }
};
let on_move_end = move || { /* camera has settled */ };
let on_idle = move || { /* everything in view has loaded and drawn */ };
let on_source_data = move |data: MapSourceData| {
    if data.loaded { /* every tile asked of data.source has arrived */ }
};

render! {
    MapView(
        map_style: MapStyle::Url("https://tiles.openfreemap.org/styles/liberty".into()),
        camera: camera,
        style: css!(flex_grow: 1.0),
        on_tap: on_tap,
        on_move_end: on_move_end,
        on_idle: on_idle,
        on_source_data: on_source_data,
    )
}
```

- `on_tap` — a tap that was not part of a pan, pinch or double tap.
  `MapTap` has `position` (`Option<LatLng>`, `None` above the horizon),
  `x` and `y` in logical pixels from the map's top left, and `features`:
  the `MapFeature`s under the tap, topmost first.
- `on_move_end` — the camera stopped moving: no finger or button is
  down and no animation is running.
- `on_idle` — the map is not moving, and every source that a layer
  reads, plus the sprite and glyphs, has loaded. Called once each time
  the map becomes idle.
- `on_source_data` — a source's data or tiles changed during the last
  frame. `MapSourceData` has `source` (the style source id) and `loaded`.

There is no per-frame camera-change callback; read the `camera` signal
instead. Callbacks run after the frame that caused them, not inside it.

`MapFeature` has `layer` (the style layer id, empty for features read
from a source), `source`, `source_layer`, `id`, `properties` (a
`serde_json::Map`), and `geometry` (GeoJSON in longitude and latitude,
clipped to the tile it came from).

## Markers

`Marker` places its children over the map with their bottom center at
`position`. `position` is a `Signal<LatLng>`, so it takes a plain
`LatLng` or a signal that moves the marker.

```rust
let position = signal(TOKYO_STATION);

render! {
    MapView(
        map_style: MapStyle::Url("https://tiles.openfreemap.org/styles/liberty".into()),
        camera: camera,
        style: css!(flex_grow: 1.0),
    ) {
        Marker(position: position) {
            View(style: css!(width: px(18), height: px(18), border_radius: px(9)))
        }
    }
}

// Later, from any handler:
position.set(LatLng::new(34.7025, 135.4959));
```

A marker is hidden while its position is behind the camera. `Marker`
panics outside a `MapView`. For many points, lines or polygons, add a
GeoJSON source and style layers instead (below); those are drawn on the
GPU and show up in `on_tap` and queries.

## The MapRef handle

`MapRef` moves, edits and queries a mounted map. Create it with
`MapRef::new()` and pass it as `map_ref:`. It is `Copy`, so it can be
moved into any number of closures.

```rust
use whisker_map::{MapRef, MapView};

let map_ref = MapRef::new();

render! {
    MapView(
        map_style: MapStyle::Url("https://tiles.openfreemap.org/styles/liberty".into()),
        camera: camera,
        style: css!(flex_grow: 1.0),
        map_ref: map_ref,
    )
}
```

Before the map mounts, style and data changes are queued and applied
once it does; camera moves and queries do nothing.

### Editing the style

| Method                                                             | Effect                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `add_source(&self, id: &str, source: serde_json::Value)`           | Adds or replaces a style source.                                              |
| `add_layer(&self, layer: serde_json::Value, before: Option<&str>)` | Adds a layer under `before`, or on top; a layer with the same id is replaced. |
| `set_geojson(&self, source: &str, data: serde_json::Value)`        | Replaces a GeoJSON source's data with a GeoJSON object or a URL.              |
| `set_projection(&self, projection: MapProjection)`                 | Lays the map out as Mercator or globe.                                        |

```rust
map_ref.add_source(
    "points",
    serde_json::json!({
        "type": "geojson",
        "data": points,
        "cluster": true,
        "clusterRadius": 50,
    }),
);
map_ref.add_layer(
    serde_json::json!({
        "id": "clusters",
        "type": "circle",
        "source": "points",
        "filter": ["has", "point_count"],
        "paint": {
            "circle-color": ["step", ["get", "point_count"], "#51bbd6", 20, "#f1f075", 60, "#f28cb1"],
            "circle-radius": ["step", ["get", "point_count"], 14, 20, 18, 60, 24],
        },
    }),
    None,
);
```

There are no methods to remove sources or layers or to change a single
paint property; replace the layer with `add_layer` instead.

### Converting between screen and map

- `to_screen(&self, place: LatLng) -> Option<(f64, f64)>` — where a
  place is drawn, in logical pixels from the map's top left; `None`
  behind the camera.
- `to_latlng(&self, x: f64, y: f64) -> Option<LatLng>` — the place
  under a point; `None` above the horizon.

### Querying features

```rust
use whisker_map::{RenderedQuery, ScreenArea, SourceQuery};

let shown = map_ref.query_rendered_features(
    None,
    RenderedQuery {
        layers: Some(vec!["clusters".into(), "point".into()]),
        ..Default::default()
    },
);

let near = map_ref.query_rendered_features(
    Some(ScreenArea::Box([0.0, 0.0], [200.0, 200.0])),
    RenderedQuery::default(),
);

let roads = map_ref.query_source_features(
    "openmaptiles",
    SourceQuery {
        source_layer: Some("transportation".into()),
        ..Default::default()
    },
);
```

`query_rendered_features` returns what the last frame drew in a
`ScreenArea` (`Point(x, y)` or `Box(corner, corner)`), or on the whole
map for `None`, topmost first. `query_source_features` returns a
source's features in the tiles being drawn, whether or not a layer
shows them; a feature that crosses tiles comes once per tile. Both
`RenderedQuery` and `SourceQuery` take an optional style-spec `filter`.

### Clusters

For a GeoJSON source with `"cluster": true`, three async methods read
the cluster index: `cluster_expansion_zoom(source, cluster_id)`,
`cluster_children(source, cluster_id)`, and
`cluster_leaves(source, cluster_id, limit, offset)`. Zooming into a
tapped cluster:

```rust
let on_tap = move |tap: MapTap| {
    let cluster = tap.features.iter().find_map(|f| {
        let id = f.properties.get("cluster_id")?.as_u64()?;
        let at = f.geometry.get("coordinates")?.as_array()?;
        Some((id, LatLng::new(at[1].as_f64()?, at[0].as_f64()?)))
    });
    if let Some((id, center)) = cluster {
        whisker::spawn_local(async move {
            if let Some(zoom) = map_ref.cluster_expansion_zoom("points", id).await {
                let target = MapCamera { center, zoom, ..camera.get_untracked() };
                map_ref.ease_to(target, Duration::from_millis(500));
            }
        });
    }
};
```

## Tile caching

Caching is automatic and has no API:

- Every fetched resource (styles, TileJSON, tiles, PMTiles ranges,
  glyphs, sprites) is kept in a 64 MiB in-memory cache shared by all
  maps.
- Off the web, responses are also written to disk under the platform's
  cache directory, in a `whisker-map` folder. A cached copy is used
  without asking the server for 7 days; after that it is refetched, and
  the stale copy is used if the fetch fails, so a previously seen area
  still draws offline. The folder is trimmed to 512 MiB at startup,
  oldest files first.
- On the web there is no disk cache; requests go through the browser's
  `fetch`.

## Attribution

`MapView` draws no attribution or logo. Show whatever credit your style
and tile providers require yourself, for example as a `View` placed
over or beside the map.

## Next steps

- [Imperative Handles](/docs/refs) — the handle pattern `MapRef`
  follows.
- [Using First-party Modules](/docs/using-modules) — other optional
  crates.
