---
title: Routing
description: The whisker-router crate — routes!, containers, transitions, hooks, and gestures.
order: 12
---

# API Reference: Routing

`whisker-router` provides declarative, URL-based navigation for Whisker
apps. The router is built on **two graphs**: a static **RouteTree** (the
`routes!` macro) and a dynamic **RouteState** (runtime navigation
state). Everything the router does — what URL a screen has, which screen
is shown, where a `navigate` pushes — is *derived* from these two graphs.

```rust
use whisker::prelude::*;
use whisker_router::*;
```

For a step-by-step walkthrough, see the [Routing guide](/docs/routing).
This page is the complete API reference.

## Architecture overview

```text
┌──────────────────────────────────────────────────────────────┐
│                      routes! { ... }                         │
│                                                              │
│   Declares the static route tree:                            │
│   • Route — a screen or layout                               │
│   • Stack — ordered container (push/pop history)             │
│   • Switch — parallel container (keep-alive, select one)     │
│                         │                                    │
│                         ▼                                    │
│                      RouteSet                                │
│          (CompiledTree + RouteRegistry)                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
                    RouterHandle::new(routes)
                           │
                    ┌──────┴──────┐
                    │ RouterHandle │  ← signal-backed; Clone to share
                    └──────┬──────┘
                           │
              ┌────────────┼─────────────┐
              ▼            ▼             ▼
         navigate()    select()      back()  ...
              │            │             │
              └────────────┼─────────────┘
                           │
                           ▼
                      RouteState
                  (mutable, runtime)
                           │
                           ▼
                     Outlet / Stack / Switch
                   (render the active route)
```

| Layer | Symbols | Purpose |
|---|---|---|
| Route tree | [`routes!`](#the-routes-macro) | Declare the screen structure |
| Handle | [`RouterHandle`](#routerhandle) | Signal-backed navigation state |
| Context | [`Router`](#router-component), [`use_navigator`](#hooks), [`use_param`](#hooks), [`use_pathname`](#hooks) | Publish/read the router |
| Renderer | [`Outlet`](#outlet), [`Stack`](#stack-renderer), [`Switch`](#switch-renderer), [`Layout`](#layout-renderer) | Turn state into UI |
| Animation | [`RouteTransition`](#transitions) | How screens enter/leave |
| Gestures | [`SwipeBack`](#gestures), [`AndroidPredictiveBack`](#gestures) | Native back gestures |

## The `routes!` macro

`routes!` declares the full screen structure and produces a
[`RouteSet`](#routeset). The grammar has three node types:

### Route

A screen or layout. Takes named keyword arguments:

```rust
Route(path: "detail/:id", component: Detail)
Route(path: "detail/:id", component: Detail, transition: RouteTransition::modal())
```

| Parameter | Required | Description |
|---|---|---|
| `path` | Yes (unless layout-only) | URL segment. `:name` for dynamic params. `(name)` for group segments |
| `component` | No | The `#[component]` to render |
| `transition` | No | A [`RouteTransition`](#transitions) override (default: platform slide) |

A `Route` with **both** a `component` and children is a **layout
route** — its component must render an `Outlet` for children to appear.
See [Route nesting](#route-nesting).

A `Route` with a parenthesised path like `(home)` is a **group route**:
the segment appears in the canonical URL but is optional during
matching. Use groups to organize Switch branches without forcing URLs.

### Stack

An ordered container with push/pop history. Its children are `Route`
nodes (or `..spread` fragments):

```rust
Stack {
    Route(path: "", component: Home)
    Route(path: "detail/:id", component: Detail)
}
```

`navigate()` pushes onto the active Stack; `back()` pops it.

### Switch

A parallel container. All branches are kept alive; one is selected:

```rust
Switch {
    Route(path: "(home)") {
        Stack { ... }
    }
    Route(path: "(search)") {
        Stack { ... }
    }
}
```

`select()` changes the active branch. `back()` never changes Switch
selection — it only pops Stacks.

### Spread

Reusable route fragments can be spread into containers:

```rust
let shared = routes! {
    Route(path: "post/:id", component: Post)
    Route(path: "profile/:id", component: Profile)
};

let app = routes! {
    Stack {
        Route(path: "", component: Home)
        ..shared
    }
};
```

### Full example

```rust
routes! {
    Route(component: TabsLayout) {
        Switch {
            Route(path: "(home)") {
                Stack {
                    Route(path: "", component: Timeline)
                    Route(path: "post/:id", component: Post)
                }
            }
            Route(path: "(search)") {
                Stack {
                    Route(path: "search", component: Search)
                    Route(path: "post/:id", component: Post)
                }
            }
        }
    }
    Route(path: "video/:id", component: VideoPlayer,
          transition: RouteTransition::modal())
}
```

## Route nesting

Nesting a `Route` inside another `Route` creates a **layout
relationship**, not a pushable screen. The parent must render an
`Outlet` for the child to appear.

```text
 ┌─ Stack ──────────────────────┐       ┌─ Stack ──────────────────────┐
 │                              │       │                              │
 │  Route(Home)                 │       │  Route(Home)                 │
 │    └── Route(Detail)  ✗     │       │  Route(Detail)         ✓    │
 │                              │       │                              │
 │  Detail is a CHILD of Home.  │       │  Detail is a SIBLING.        │
 │  navigate() modifies         │       │  navigate() pushes Detail    │
 │  child state in-place.       │       │  onto the Stack.             │
 │  back() does not pop.        │       │  back() pops to Home.        │
 └──────────────────────────────┘       └──────────────────────────────┘
```

Reserve Route nesting for layout routes (tab bar, header chrome) where
the parent renders shared UI around an `Outlet`.

## URL derivation

A Route's URL is the concatenation of all segments from root to leaf.
Containers (`Stack`/`Switch`) contribute nothing.

```text
Route(component: TabsLayout)           → (no segment)
  └─ Switch                            → (no segment)
       └─ Route(path: "(home)")        → /(home)
            └─ Stack                   → (no segment)
                 └─ Route("detail/:id") → /(home)/detail/:id
```

Group segments `(name)` appear in canonical URLs but are skipped during
matching: `navigate("/detail/42")` matches `/(home)/detail/:id`.

## RouteSet

The output of `routes!`. Contains:

- A `CompiledTree` — the static tree with pre-computed URLs and node paths
- A `RouteRegistry` — the id → render-function + transition map
- A `LayoutRegistry` — layout route → component map

Construct manually with `RouteSet::from_parts(tree, registry)` for the
rare hand-built case.

## RouterHandle

The signal-backed navigation handle. Owns the immutable tree, registry,
and a single `RwSignal<RouteState>`. `Clone` shares the same underlying
state (it is `Rc`-backed).

### Construction

```rust
let handle = RouterHandle::new(routes! { ... });
```

### Navigation operations

All targets are plain `&str` URLs. Returns `Result<(), NavError>`.

| Method | Effect |
|---|---|
| `navigate(url)` | Push the matched route onto the active Stack. Always pushes — no dedup |
| `select(url)` | Select the Switch branch containing the target (tab switching) |
| `back()` | Pop the deepest non-trivial Stack. `NothingToPop` at root |
| `replace(url)` | Swap the top of the current Stack (same-Stack only) |
| `pop_to(url)` | Pop until the target is on top (same-Stack only) |
| `reset(url)` | Clear the current Stack and restart with the target |

```rust
let nav = use_navigator();
nav.navigate("/detail/42");    // push
nav.select("/(search)");      // switch tab
nav.replace("/detail/99");     // swap top
nav.back();                    // pop
nav.pop_to("/");               // pop to root
nav.reset("/");                // clear + restart
```

### NavError

| Variant | Meaning |
|---|---|
| `NoSuchTarget` | URL matches no route in the tree |
| `NothingToPop` | `back()` at a root with nothing to pop |

### Resolution rule

When a URL matches **multiple** positions (e.g. shared `post/:id` in
both tabs), relative resolution picks the instance sharing the
**deepest common ancestor with the current position**. Ties break by
**declaration order** (first defined wins).

| Situation | Resolves to | Why |
|---|---|---|
| From tab A, `navigate("/post/42")` | Tab A's `post/:id` | Deepest common ancestor |
| From tab B, `navigate("/post/42")` | Tab B's `post/:id` | Within tab B's subtree |
| From outside tabs | First declared | Common ancestor is root |

## Router component

Publishes the handle into context and creates a positioned root view.
Mount renderers and gestures as children:

```rust
Router(handle: handle) {
    Outlet {}
    SwipeBack {}
    AndroidPredictiveBack {}
}
```

| Prop | Type | Notes |
|---|---|---|
| `handle` | `RouterHandle` | The navigation handle |
| `children` | `Children` | Renderers + gesture components |

## Renderers

Renderers turn the current `RouteState` into UI. They are mounted
inside a `Router` (or inside a layout route's `Outlet`).

### Outlet

Renders the active route at the current anchor point. In a layout
route's component, `Outlet` renders that route's active child:

```rust
#[component]
fn tabs_layout() -> Element {
    render! {
        view(style: css!(flex_grow: 1.0)) {
            Outlet {}     // renders the active child
        }
        MyTabBar {}       // persistent chrome
    }
}
```

No props. `Outlet` reads the router context and the current anchor
path to determine what to render.

### Stack renderer

The `Stack` renderer handles Stack containers: it manages push/pop
history with screen-preserving wrappers and coordinated transitions.

### Switch renderer

The `Switch` renderer handles Switch containers: it keeps all branches
mounted and toggles visibility based on the selected branch.

### Layout renderer

The `Layout` renderer handles layout routes: it renders the layout
component (which must contain an `Outlet`) and passes children through.

## Hooks

### `use_navigator()`

Retrieve the `RouterHandle` from context. Panics if called outside a
`Router`.

```rust
let nav = use_navigator();
nav.navigate("/detail/42");
```

### `use_param(name)`

Read a named path parameter from the route the calling component is
mounted under. Returns `ReadSignal<Option<String>>`.

```rust
// Route(path: "detail/:id", component: Detail)
let id = use_param("id");
let label = format!("Detail #{}", id.get().unwrap_or_default());
```

### `use_pathname()`

The current URL as a reactive string (e.g. `"/detail/42"`). Recomputes
on every navigation. Useful for tab-bar highlighting:

```rust
let pathname = use_pathname();
let is_home = computed(move || !pathname.get().contains("/search"));
```

## Transitions

A `RouteTransition` defines how a route enters and leaves its Stack.
Transitions are **parameters of the `Route`**, not the component —
the same component can have different transitions at different Route
sites.

### Built-in transitions

| Constructor | Description |
|---|---|
| `RouteTransition::slide()` | iOS-style horizontal slide with parallax and dim (iOS default) |
| `RouteTransition::android_default()` | Subtle horizontal slide + fade (Android default) |
| `RouteTransition::fade()` | Cross-fade opacity |
| `RouteTransition::modal()` | Slide up from the bottom |
| `RouteTransition::none()` | No animation — instant swap |

The default is **platform-aware**: `slide()` on iOS, `android_default()`
on Android.

### Per-route transition

```rust
routes! {
    Stack {
        Route(path: "", component: Home)
        Route(path: "detail/:id", component: Detail)
        Route(path: "compose", component: Compose,
              transition: RouteTransition::modal())
    }
}
```

### Custom transitions

Implement the `Transition` trait and wrap with `RouteTransition::custom`:

```rust
struct ZoomIn;

impl Transition for ZoomIn {
    fn config(&self) -> AnimConfig {
        AnimConfig::new(300, "ease-out")
    }

    fn pose(&self, ctx: PoseContext) -> Pose {
        match ctx.role {
            Role::Top => {
                let scale = 0.85 + 0.15 * ctx.progress;
                Pose::new(
                    format!("scale({})", scale),
                    ctx.progress,  // opacity
                )
            }
            Role::Under => Pose::new(String::new(), 1.0),
        }
    }
}

Route(path: "preview", component: Preview,
      transition: RouteTransition::custom(ZoomIn))
```

### Transition types

| Type | Description |
|---|---|
| `RouteTransition` | `Rc`-backed wrapper (cheap to Clone) |
| `Transition` (trait) | `config()` + `pose(PoseContext) -> Pose` |
| `PoseContext` | `{ role: Role, progress: f32, direction: Direction }` |
| `Pose` | `{ transform: String, opacity: f32, radius_px: f32 }` |
| `Role` | `Top` (entering/leaving) or `Under` (beneath) |
| `Direction` | `Push` (forward) or `Pop` (back) |
| `AnimConfig` | Duration (ms) + easing function |

### Progress convention

`progress` is "how present the top screen is":

- `1.0` → top screen fully on screen
- `0.0` → top screen fully off screen

A **push** drives `0.0 → 1.0`; a **pop** drives `1.0 → 0.0`. One
controller drives both the Top and Under wrappers — the "gesture spans
two routes" problem solved by composition.

## Gestures

Back gesture components are mounted as children of `Router`. Each reads
the router context, renders no DOM of its own, and is a no-op on the
platform it doesn't target.

| Component | Platform | Description |
|---|---|---|
| `SwipeBack` | iOS | Edge swipe-back gesture |
| `AndroidPredictiveBack` | Android 13+ | System predictive back with Material card preview |

```rust
Router(handle: handle) {
    Outlet {}
    SwipeBack {}
    AndroidPredictiveBack {}
}
```

Both gestures **scrub the existing transition** — they reuse the
route's push/pop animation, replacing time with finger progress. No
separate "interactive animation" is defined.

The Android predictive back implements the full Material shared-element
card: the top screen shrinks to ~90%, rounds to the device corner
radius, and shifts toward the swipe edge. On commit, the card fades and
the previous screen slides in.

## Modals

A modal is an ordinary `Route` with a modal transition:

```rust
Route(path: "compose", component: Compose,
      transition: RouteTransition::modal())
```

It stacks normally — `navigate("/compose")` pushes it, `back()` pops
it. The transition changes only the animation (slide-up), not the
semantics. Place modals as children of the root Stack (above the tabs
layout) to cover the entire window including the tab bar.

## Plugin

`whisker-router` ships a build plugin that automatically adds
`enableOnBackInvokedCallback="true"` to the Android manifest when the
crate is in your dependency tree. No explicit plugin registration is
needed — it is discovered and applied automatically.

## See also

- [Routing guide](/docs/routing) — step-by-step walkthrough
- [Components](/docs/components) — defining the screens you navigate between
- [State Management](/docs/state-management) — signals that drive reactive UI
- [Formatting](/docs/formatting) — `whisker fmt` formats `routes!` bodies too
