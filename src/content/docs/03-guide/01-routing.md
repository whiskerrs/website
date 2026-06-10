---
title: Routing
description: Add screen navigation with whisker-router.
order: 1
---

# Routing

This guide walks through adding screen-to-screen navigation to a
Whisker app with the `whisker-router` crate. We'll build a small
two-screen flow — a list of items that pushes a detail screen when you
tap a row, with a native iOS slide transition and a working back
gesture.

For the complete API surface (every layout, transition, and gesture),
see the [Routing reference](/docs/routing-api). This page is the
fast path to a working router.

## 1. Add the dependency

`whisker-router` is a companion crate. Add it to your app's
`Cargo.toml` alongside `whisker`:

```toml
[dependencies]
whisker = { workspace = true }
whisker-router = { path = "../whisker/packages/whisker-router" }
```

The crate has **no prelude** — every public symbol is re-exported from
the crate root, so import what you use directly:

```rust
use whisker::prelude::*;
use whisker_router::{
    route, route_stack, RouteProvider, RouteProviderProps, RouteRenderFn,
    StackLayout, StackLayoutProps, IosSlide, StackTransitionBox,
    IosSwipeBack, IosSwipeBackProps,
};
```

## 2. Define a route enum

A route is a typed enum. Annotate it with `#[route]` and give each
variant an `#[at("...")]` pattern. The macro derives a `Route` impl
that round-trips between each enum value and its canonical URL path.

```rust
#[route]
#[derive(Clone, Debug, PartialEq)]
pub enum AppRoute {
    #[at("/")]            Home,
    #[at("/detail/:id")]  Detail { id: u64 },
}
```

Path rules in brief:

- A leading `/` is required (the index route is just `/`).
- `:name` binds to a variant field of the same name; the field type
  must implement `FromStr` and `Display` (`u64`, `String`, your own
  enums).
- Use **named-field** variants (`Detail { id: u64 }`). Tuple-struct
  variants (`Detail(u64)`) are a compile error in v1.

The full path grammar is in the
[Routing reference](/docs/routing-api#defining-routes).

## 3. Create a RouteStack

The back stack is a `RouteStack<R>` — a cloneable, reactive handle.
Create one with `route_stack(initial)` (or `RouteStack::new`). The
stack always keeps at least one entry, so `back()` is a no-op at the
root rather than emptying the stack.

```rust
let nav = route_stack(AppRoute::Home);
```

Cloning the handle shares the same underlying storage, so you can pass
it as a prop, capture it in closures, or look it up from context later.

## 4. Map routes to screens

A `RouteRenderFn` turns the current route value into an `Element`.
Write a plain closure that matches each variant to a screen, then call
`.into()` to wrap it:

```rust
let render: RouteRenderFn<AppRoute> = (|r: AppRoute| match r {
    AppRoute::Home          => render! { HomeScreen() },
    AppRoute::Detail { id } => render! { DetailScreen(id: id) },
})
.into();
```

## 5. Wire it up with RouteProvider + StackLayout

`RouteProvider` publishes the stack into context so descendants can
look it up by type. Inside it, mount a renderer. We'll use
`StackLayout` — the back-stack-preserving navigator with native
push/pop animation that keeps every entry mounted, so going back
restores the previous screen's scroll position and state.

```rust
#[whisker::main]
fn app() -> Element {
    let nav = route_stack(AppRoute::Home);

    let render: RouteRenderFn<AppRoute> = (|r: AppRoute| match r {
        AppRoute::Home          => render! { HomeScreen() },
        AppRoute::Detail { id } => render! { DetailScreen(id: id) },
    })
    .into();

    render! {
        page(style: "width: 100vw; height: 100vh; \
                     display: flex; flex_direction: column;") {
            RouteProvider(stack: nav) {
                StackLayout(
                    transition: StackTransitionBox::new(IosSlide::default()),
                    render: render,
                ) {
                    IosSwipeBack()
                }
            }
        }
    }
}
```

The `transition` prop is optional — it defaults to `IosSlide`, so you
can drop it and get the same result. Other built-ins are `Fade`,
`VerticalSlide`, and `Instant` (no animation); see
[Transitions](/docs/routing-api#transitions).

If you don't need animation or state preservation, swap `StackLayout`
for the lighter `Outlet`, which mounts the current route and disposes
the previous one on every navigation.

## 6. Navigate

From any descendant component, look up the stack from context with
`router::<R>()` — no need to thread the handle through props — and call
its mutators:

```rust
use whisker_router::router;

#[component]
fn HomeScreen() -> Element {
    let nav = router::<AppRoute>();
    render! {
        page(style: "padding: 16px; flex_direction: column;") {
            text(value: "Items")
            view(on_tap: move |_| nav.push(AppRoute::Detail { id: 1 })) {
                text(value: "Open item 1")
            }
            view(on_tap: move |_| nav.push(AppRoute::Detail { id: 2 })) {
                text(value: "Open item 2")
            }
        }
    }
}

#[component]
fn DetailScreen(id: Signal<u64>) -> Element {
    let nav = router::<AppRoute>();
    render! {
        page(style: "padding: 16px; flex_direction: column;") {
            text(value: move || format!("Detail for item {}", id.get()))
            view(on_tap: move |_| { nav.back(); }) {
                text(value: "Back")
            }
        }
    }
}
```

`router::<R>()` **panics** if no `RouteProvider<R>` ancestor is
mounted, so always wrap your navigating tree in a provider.

The main mutators:

| Call | Effect |
|---|---|
| `nav.push(route)` | Push a new screen on top |
| `nav.back()` | Pop the top (no-op at the root; returns `bool`) |
| `nav.replace(route)` | Swap the top entry — depth unchanged (e.g. login → home) |
| `nav.replace_all(route)` | Clear the stack and restart at the root (logout) |

Reactive readers (`current()`, `can_back()`, `stack()`, `depth()`)
return signals you can drive UI from — for example, `nav.can_back()`
to show or hide a back button. The full list is in the
[Routing reference](/docs/routing-api#routestack).

## 7. Add the native back gesture

`IosSwipeBack` (above) gives you the iOS edge swipe-back. Each gesture
component renders no DOM of its own, reads the `StackLayout`'s context
handle, and is a no-op on the platform it doesn't target — so pairing
both is safe:

```rust
StackLayout(render: render) {
    IosSwipeBack()
    AndroidPredictiveBack()
}
```

For the Android hardware/predictive back button, add
`AndroidPredictiveBack`. Both come from the crate root
(`whisker_router::{IosSwipeBack, AndroidPredictiveBack}` plus their
`*Props`).

To intercept a back press from an ad-hoc consumer (say, to dismiss a
modal first), use the `on_back` LIFO handler chain — see
[Back handling](/docs/routing-api#back-handling--gestures).

## Run it

```bash
whisker run ios
```

Tap a row to push the detail screen with the slide animation; swipe
from the left edge (or tap your Back row) to pop it. Because
`StackLayout` keeps entries mounted, the home list is exactly where you
left it when you come back.

## A note on deep links

`whisker-router` exposes a `linking` module (`linking::initial_url()`
and `linking::on_url(...)`) for cold-launch and post-launch URLs. The
signatures are stable, **but both functions are currently non-working
stubs** — `initial_url()` always returns `None` and the `on_url`
handler is never invoked, pending the runtime-side global-event
primitive. Code against them now if you like, but deep links won't
resolve yet. See
[Deep linking](/docs/routing-api#deep-linking) for status.

## Next steps

- [Routing reference](/docs/routing-api) — every layout
  (`TabsLayout`, `ModalLayout`, `Pane`), transition, and gesture.
- [Components & render!](/docs/components) — defining the screens you
  navigate between.
- [State Management](/docs/state-management) — the signals that drive
  reactive UI inside each screen.
