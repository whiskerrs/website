---
title: Routing
description: The whisker-router crate — routes, stacks, layouts, transitions, and gestures.
order: 12
---

# API Reference: Routing

`whisker-router` is a companion crate (add it to `Cargo.toml`
alongside `whisker`) that provides type-safe, signal-backed
navigation. A route is a typed enum; the back stack is a cloneable,
[reactive](/docs/reactivity-api) handle; rendering, animation, and
back gestures are layered on top so you pick only what you need.

```rust
use whisker::prelude::*;
use whisker_router::*;
```

> The crate has **no `prelude` module** — every public symbol is
> re-exported from the crate root. Import what you use directly
> (`use whisker_router::{route, route_stack, RouteProvider, StackLayout};`)
> or glob the root as above.

The layers, lowest to highest:

| Layer | Symbol | Purpose |
|---|---|---|
| Route type | [`Route`](#the-route-trait) trait + [`#[route]`](#defining-routes) | Typed enum ↔ URL path |
| Back stack | [`RouteStack<R>`](#routestack) | The cloneable, reactive navigation state |
| Context | [`RouteProvider`](#wiring-it-up) / [`router::<R>()`](#wiring-it-up) | Publish / look up the stack |
| Renderer | [`Outlet`](#wiring-it-up), [`StackLayout`](#layouts), [`TabsLayout`](#layouts), [`ModalLayout`](#layouts), [`Pane`](#layouts) | Turn the current route into UI |
| Animation | [`StackTransition`](#transitions) | How `StackLayout` animates |
| Gestures | [`IosSwipeBack`](#back-handling--gestures), [`AndroidPredictiveBack`](#back-handling--gestures) | Opt-in native back gestures |
| Back chain | [`on_back`](#back-handling--gestures) | LIFO interceptors |
| Deep links | [`linking`](#deep-linking) | Cold-launch + post-launch URLs (stub) |

## Defining routes

Annotate an enum with `#[route]` and give each variant an
`#[at("/path/:param")]` pattern. The macro generates a
[`Route`](#the-route-trait) impl whose `parse` / `to_path` round-trip
between the enum value and its canonical URL.

```rust
use whisker_router::route;

#[route]
#[derive(Clone, Debug, PartialEq)]
pub enum AppRoute {
    #[at("/")]                 Home,
    #[at("/profile/:id")]      Profile { id: u64 },
    #[at("/blog/:slug/edit")]  EditPost { slug: String },
    #[at("/settings")]         Settings,
}

// Generated impl:
assert_eq!(AppRoute::parse("/profile/42"), Ok(AppRoute::Profile { id: 42 }));
assert_eq!(AppRoute::Profile { id: 42 }.to_path(), "/profile/42");
```

### Path grammar

| Form | Meaning |
|---|---|
| `/` (or empty) | The index route — a unit variant with no params |
| `literal` | Matched verbatim |
| `:name` | A parameter, bound to the variant field named `name` |

- A leading `/` is required; a trailing `/` is tolerated on input and
  elided on output.
- Parameter field types must implement `FromStr` (for `parse`) and
  `Display` (for `to_path`) — `u64`, `String`, custom enums all work.
- `:param` order in the path may differ from field declaration order.

### Variant kinds

| Kind | Example | Supported |
|---|---|---|
| Unit | `Home` | Yes — pattern must have no `:param` |
| Named-field | `Profile { id: u64 }` | Yes — every field bound by exactly one `:name`, and vice versa |
| Tuple-struct | `Profile(u64)` | **No** in v1 — `compile_error!` directs you to the named-field form |

Compile-time errors fire for: a missing `#[at(...)]`, a `:param`
naming a non-existent field, a field with no `:name` binding, a
tuple-struct variant, and `#[route]` on a non-enum.

### The `Route` trait

You can also hand-write `Route` for full control over parsing.

```rust
pub trait Route: Clone + PartialEq + 'static {
    fn parse(path: &str) -> Result<Self, RouteError> where Self: Sized;
    fn to_path(&self) -> String;
}
```

| Item | Notes |
|---|---|
| Bounds `Clone + PartialEq + 'static` | Required so [`RouteStack`](#routestack) can store values in a signal, compare entries, and move them into reactive closures |
| `parse(path)` | URL path → route value. Should tolerate optional leading / trailing slashes |
| `to_path()` | Route value → canonical URL path; round-trips with `parse` |

#### `RouteError`

Returned by `Route::parse`. `#[non_exhaustive]`; implements
`std::error::Error` so it bubbles through `?`.

| Variant | Meaning |
|---|---|
| `NoMatch(String)` | No route matched the path (payload is the original path) |
| `BadParam { param: &'static str, value: String }` | A `:param` segment failed to parse into its field type |

## RouteStack

`RouteStack<R>` is the navigation primitive: a back stack of routes
backed by a single `RwSignal`. It is a **handle** — cloning shares the
same underlying storage, so you can pass it as a prop, capture it in
closures, or hold several in parallel (the tab-per-stack pattern).

Construct one with `route_stack(initial)` (or `RouteStack::new`). The
stack always keeps **at least one entry** — `back()` is a no-op at the
root rather than emptying the stack.

```rust
use whisker_router::route_stack;

let nav = route_stack(AppRoute::Home);
nav.push(AppRoute::Profile { id: 7 });
nav.back();
assert_eq!(nav.current().get(), AppRoute::Home);
```

### Mutators

| Method | Effect |
|---|---|
| `push(route)` | Push a new top; previous top becomes `Suspended`, new entry starts `Entering` |
| `back() -> bool` | Pop the top if depth > 1. Returns `true` if popped, `false` at the root |
| `back_to(\|&R\| -> bool)` | Pop until the predicate accepts the new top (stops at the root regardless) |
| `replace(route)` | Swap the top entry — depth unchanged (redirects: login → home) |
| `replace_all(route)` | Clear the stack and start over at the root (logout, deep-link cold-launch) |

### Reactive readers

Each returns a [`ReadSignal`](/docs/reactivity-api) that re-fires when
the relevant part of the stack changes.

| Method | Returns | Use |
|---|---|---|
| `current()` | `ReadSignal<R>` | The topmost route — what's showing now |
| `stack()` | `ReadSignal<Vec<R>>` | Every level, root → top (breadcrumbs, tab bars) |
| `entries()` | `ReadSignal<Vec<RouteEntry<R>>>` | Entries incl. `EntryState` / `EntryId` — for animating layouts |
| `can_back()` | `ReadSignal<bool>` | `true` once there's something above the root — drive a back button |
| `depth()` | `ReadSignal<usize>` | Number of entries on the stack |

### Entry types

| Type | Shape | Notes |
|---|---|---|
| `RouteEntry<R>` | `{ route: R, state: RwSignal<EntryState>, id: EntryId }` | One slot in the stack; equality compares both `id` and `route` |
| `EntryId` | `pub struct EntryId(pub u64)` | Stable id for an entry's lifetime — the diff key for animations |
| `EntryState` | enum | Lifecycle stage layouts read to choose styles / freeze effects |

`EntryState` variants: `Entering` (just pushed, animating in),
`Active` (settled on top), `Suspended` (kept mounted beneath the top),
`Leaving` (just popped, animating out then dropped).

## Wiring it up

Publish the stack with `RouteProvider` so descendants can look it up
by type with `router::<R>()`, then mount a renderer.

```rust
#[component]
fn app() -> Element {
    let nav = route_stack(AppRoute::Home);
    render! {
        RouteProvider(stack: nav.clone()) {
            Outlet(render: (|r: AppRoute| match r {
                AppRoute::Home              => render! { HomeScreen() },
                AppRoute::Profile { id }    => render! { ProfileScreen(id: id) },
                AppRoute::EditPost { slug } => render! { EditPost(slug: slug) },
                AppRoute::Settings          => render! { SettingsScreen() },
            }).into())
        }
    }
}
```

Navigate from any descendant without threading the handle through
props:

```rust
let nav = router::<AppRoute>();
render! {
    view(on_tap: move |_| nav.push(AppRoute::Settings)) {
        text(value: "Open settings")
    }
}
```

| Symbol | Role |
|---|---|
| `RouteProvider` / `route_provider(stack, children)` | Pushes the stack into [context](/docs/reactivity-api); renders only its `children`. One provider per route type; nested providers of different `R` coexist (tab-per-stack) |
| `router::<R>() -> RouteStack<R>` | Looks up the stack from context. **Panics** if no `RouteProvider<R>` ancestor is mounted |
| `Outlet` / `outlet(render)` | Mount-only renderer — observes `current()`, disposes the previous branch, mounts a fresh one. No animation, no back-stack preservation. Cheapest path |

### `RouteRenderFn<R>`

The `render` prop of `Outlet` and `StackLayout`. It wraps an
`Rc<dyn Fn(R) -> Element>` so a renderer with non-`Copy` captures can
be shared. A `From` impl makes `.into()` the usual call-site shape, so
you write a plain closure and append `.into()`.

| Item | Signature |
|---|---|
| Constructor | `(\|r: AppRoute\| ...).into()` via the `From<Fn(R) -> Element>` impl |
| `.call(route) -> Element` | Invoke the renderer |

`Outlet` fully **disposes** the previous branch (its signals, effects,
spawned tasks) before mounting the next — screens don't leak across
navigation but also don't survive a back. If you want scroll position
and form state preserved across push/back, use `StackLayout` instead.

## Layouts

Pick the renderer that fits the surface. All except `Pane` read the
in-context `RouteStack` via `router::<R>()`, so wrap them in a
`RouteProvider`.

| Layout | Use it when |
|---|---|
| `Outlet` | You need no animation and no back-stack preservation (above) |
| `StackLayout` | A screen stack with native push/pop animation; keeps every entry mounted so back restores state |
| `TabsLayout` | A keep-alive tab switcher driven by per-tab predicates over the same stack |
| `ModalLayout` | A slide-from-bottom modal sheet driven by a single route value (not a stack) |
| `Pane` | A `display`-toggleable keep-alive container — the building block behind `TabsLayout` |

### StackLayout

Back-stack-preserving stack navigator with pluggable animation.
`UINavigationController` / Android back-stack semantics: every entry
stays mounted (state survives push/back); only popped entries are
disposed, deferred until their pop animation finishes.

```rust
use whisker_router::{StackLayout, StackTransitionBox, IosSlide, IosSwipeBack};

render! {
    RouteProvider(stack: nav.clone()) {
        StackLayout(
            transition: StackTransitionBox::new(IosSlide::default()),
            render: render.into(),
        ) {
            IosSwipeBack()  // opt-in gesture, mounted as a child
        }
    }
}
```

| `StackLayoutProps` field | Type | Notes |
|---|---|---|
| `transition` | `StackTransitionBox` | Optional — defaults to `IosSlide` |
| `render` | `RouteRenderFn<R>` | Maps the current route to an element |
| `children` | `Children` | Gesture components mounted into the layout |

`StackLayout` publishes a **`StackLayoutHandle`** into context (erased
over `R`) so child gesture components can drive it. Retrieve it with
`use_context::<StackLayoutHandle>()`. Fields: `container` (the root
view element), plus `Rc`-wrapped closures `current_wrapper`,
`mount_preview`, `dispose_preview`, `commit_preview_and_back`, and
`back`. For plain back navigation you don't need the handle —
`router::<R>().back()` is enough; the handle is for the interactive
swipe/predictive paths.

### TabsLayout

Keep-alive tab switcher. All tabs mount at once and toggle between
`display: flex` / `display: none`, so each tab's scroll position,
in-flight requests, and signal values survive switching.

```rust
use whisker_router::{TabSpec, TabsLayout};

render! {
    RouteProvider(stack: nav.clone()) {
        TabsLayout(
            tabs: vec![
                TabSpec::new(
                    |r: &AppRoute| matches!(r, AppRoute::Home),
                    || render! { HomeStack() },
                ),
                TabSpec::new(
                    |r: &AppRoute| matches!(r, AppRoute::Settings),
                    || render! { SettingsStack() },
                ),
            ],
            bar: BottomBar(nav: nav.clone()).into(),
        )
    }
}
```

| `TabsLayoutProps` field | Type | Notes |
|---|---|---|
| `tabs` | `Vec<TabSpec<R>>` | One per tab |
| `bar` | `Option<Element>` | Optional — a bottom bar appended below the panes |

`TabSpec::new(matches, content)`: `matches: Fn(&R) -> bool` decides
which current route belongs to the tab (runs inside a reactive
`computed` on every route change — keep it cheap, usually a
`matches!()`); `content: Fn() -> Element` renders the tab body once at
mount.

### ModalLayout

Slide-from-bottom modal sheet, driven by a single route value (not a
stack). A dimmed scrim sits behind; the sheet slides up on mount. Use
it as a leaf of an `Outlet` or as a sibling of a stack — you control
presentation by mounting / unmounting it.

```rust
use whisker_router::ModalLayout;

render! {
    ModalLayout(
        route: AppRoute::Settings,
        render: (|r: AppRoute| match r {
            AppRoute::Settings => render! { SettingsSheet() },
            _ => render! { fragment() },
        }).into(),
    )
}
```

| `ModalLayoutProps` field | Type |
|---|---|
| `route` | `R` |
| `render` | `ModalRenderFn<R>` |

`ModalRenderFn<R>` mirrors `RouteRenderFn<R>` (`Rc<dyn Fn(R) -> Element>`,
`.call`, `.into()` from a closure), kept separate so the prop type is
explicit at the call site.

### Pane

A `display`-toggleable container whose children stay mounted while
hidden — the building block behind `TabsLayout`. The `visible` prop is
a `Fn() -> bool` (same shape as [`Show`](/docs/control-flow)'s `when`).

```rust
use whisker_router::Pane;

render! {
    view(style: css!(flex_grow: 1)) {
        Pane(visible: move || tab.get() == Tab::Home)     { Home() }
        Pane(visible: move || tab.get() == Tab::Settings) { Settings() }
    }
}
```

| `PaneProps` field | Type |
|---|---|
| `visible` | `WhenFn` (a `Fn() -> bool`) |
| `children` | `Children` |

## Transitions

A `StackTransition` describes *how a screen looks* during a navigation.
It is purely visual — back gestures are separate
[composable components](#back-handling--gestures), not part of this
trait.

```rust
pub trait StackTransition: 'static {
    fn animate(&self, element: Element, side: Side, direction: Direction);
    fn foreground(&self, direction: Direction) -> Side { /* default */ }
    fn slot_style(&self, side: Side, direction: Direction) -> Style { /* default "" */ }
}
```

| Method | Role |
|---|---|
| `animate` | Drive the per-slot animation. Called once with `Side::Incoming`, then once with `Side::Outgoing`, from `on_mount` |
| `foreground` | Which side paints on top. Default: `Incoming` on `Forward` / `None`, `Outgoing` on `Backward`. `StackLayout` uses this to choose DOM insertion order (Lynx ignores z-index mid-transform) |
| `slot_style` | Inline CSS appended to a slot wrapper, by side + direction. Carries properties the animator drops (e.g. `box-shadow`). Returns an empty `Style` by default |

Wrap any implementation in `StackTransitionBox::new(...)` to satisfy
`StackLayout`'s `Clone` prop bound; `StackTransitionBox::default()` is
`IosSlide`.

### Supporting types

| Type | Variants / value |
|---|---|
| `Direction` | `Forward` (push), `Backward` (back), `None` (replace / first mount) |
| `Side` | `Incoming` (new top), `Outgoing` (screen being replaced) |
| `IOS_PARALLAX_PCT` | `const f32 = 30.0` — UIKit parallax amount; reused by the swipe-back gesture |

### Built-in transitions

| Transition | Description | Tunables |
|---|---|---|
| `IosSlide` | **Default.** UINavigationController horizontal slide, ~30% parallax, leading-edge shadow + background dim | `duration_ms` (320), `easing` (`"ease-in-out"`) |
| `VerticalSlide` | Y-axis analogue of `IosSlide` — slides up on push | `duration_ms` (320), `easing` (`"ease-in-out"`) |
| `Fade` | Opacity cross-fade; `foreground` is always `Incoming` | `duration_ms` (320), `easing` (`"linear"`) |
| `Instant` | No animation — entries swap in one frame (unit struct) | — |

```rust
struct ZoomIn;
impl StackTransition for ZoomIn {
    fn animate(&self, el: Element, side: Side, _dir: Direction) {
        if side != Side::Incoming { return; }
        whisker::animate_start(el, "zoom-in", &[
            ("0%",   &[("transform", "scale(0.85)"), ("opacity", "0")]),
            ("100%", &[("transform", "scale(1.0)"),  ("opacity", "1")]),
        ], &whisker::AnimateOptions::default()).ok();
    }
}

render! {
    StackLayout(transition: StackTransitionBox::new(ZoomIn), render: render.into())
}
```

## Back handling & gestures

### `on_back`

An imperative LIFO back-handler chain for ad-hoc consumers (a modal,
a search bar) that want to intercept a back press. Handlers run
most-recently-registered first; the first to return `true` consumes
the event, otherwise it forwards down the chain to the host platform.

```rust
use whisker_router::on_back;

let _guard = on_back(move || {
    if dialog_open.get() {
        dialog_open.set(false);
        true   // consumed
    } else {
        false  // forward to the next handler / the OS
    }
});
```

`on_back(handler) -> BackHandlerGuard`. The guard removes the handler
on drop — bind it in a component body and let `on_cleanup` drop it on
unmount. `BackHandlerGuard::forget()` disarms the guard so the handler
outlives the local binding.

> Use `on_back` for *ad-hoc* interception. The structural back path
> for `StackLayout` is owned by the gesture components below.

### Gesture components

Opt-in native back gestures, mounted as children of `StackLayout`.
Each reads the `StackLayoutHandle` from context, renders no DOM of its
own, and is a no-op on the platform it doesn't target — so pairing
both is safe.

| Component | Platform | Props |
|---|---|---|
| `IosSwipeBack` / `IosSwipeBackProps` | iOS edge swipe-back | none |
| `AndroidPredictiveBack` / `AndroidPredictiveBackProps` | Android system / predictive back | none |

```rust
render! {
    StackLayout(render: render.into()) {
        IosSwipeBack()
        AndroidPredictiveBack()
    }
}
```

## Deep linking

The `linking` module is the deep-link surface: a synchronous read of
the cold-launch URL plus a subscription for URLs delivered after
launch.

```rust
use whisker_router::{linking, route_stack, Route};

let initial = linking::initial_url()
    .and_then(|u| AppRoute::parse(&u).ok())
    .unwrap_or(AppRoute::Home);
let nav = route_stack(initial);

linking::on_url(move |url| {
    if let Ok(r) = AppRoute::parse(&url) {
        nav.push(r);
    }
});
```

| Function | Signature |
|---|---|
| `linking::initial_url` | `() -> Option<String>` |
| `linking::on_url` | `<F: Fn(String) + 'static>(handler: F)` |

> **Status — not yet wired.** Both functions are **stubs** in the
> current revision. `initial_url()` always returns `None` and the
> handler passed to `on_url()` is never invoked, pending the
> runtime-side global-event primitive. The signatures above are stable
> — code against them now — but deep links do not resolve yet.

## See also

- [Macros](/docs/macros) — `#[component]`, `render!`, `css!`
- [Reactivity](/docs/reactivity-api) — signals, `computed`, context
- [Control Flow](/docs/control-flow) — `Show` (the `WhenFn` shape `Pane` reuses)
- [Elements](/docs/elements) — the `Element` type renderers return
