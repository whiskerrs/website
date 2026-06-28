---
title: Routing
description: Add screen navigation with whisker-router.
order: 1
---

# Routing

This guide walks through adding screen-to-screen navigation to a
Whisker app with the `whisker-router` crate. We'll build a small
two-screen flow — a list that pushes a detail screen with a native
slide transition and a working back gesture — then layer on tabs.

For the complete API surface (every container, transition, and hook),
see the [Routing reference](/docs/routing-api). This page is the
fast path to a working router.

## 1. Add the dependency

`whisker-router` is a companion crate. Add it to your app's
`Cargo.toml` alongside `whisker`:

```toml
[dependencies]
whisker = { workspace = true }
whisker-router = "0.6"
```

Import what you need directly — the crate has no `prelude`:

```rust
use whisker::prelude::*;
use whisker_router::{
    routes, Router, Outlet,
    SwipeBack, AndroidPredictiveBack,
    use_navigator, use_param,
};
```

## 2. Declare the route tree

Routes are declared with the `routes!` macro. The macro takes a nested
block of **containers** (`Stack`, `Switch`) and **routes** (`Route`)
and produces a `RouteSet` — the compiled tree + component registry the
router needs.

```rust
routes! {
    Stack {
        Route(path: "", component: Home)
        Route(path: "detail/:id", component: Detail)
    }
}
```

- `Stack` — an ordered container with push/pop history.
- `Route(path:, component:)` — a screen with a URL segment and
  a component.
- `:id` in a path is a dynamic parameter. Read it at render time
  with `use_param("id")`.

The full grammar is in the
[Routing reference](/docs/routing-api#the-routes-macro).

## 3. Mount the Router

`Router` takes the route tree, publishes the handle into context, and
creates a positioned root container. Inside it, mount an `Outlet`
(renders the active route) and optional gesture components:

```rust
#[whisker::main]
fn app() -> Element {
    render! {
        view(style: css!(
            flex_grow: 1.0,
            width: vw(100),
            height: vh(100),
            display: Display::Flex,
            flex_direction: FlexDirection::Column,
        )) {
            Router(routes: routes! {
                Stack {
                    Route(path: "", component: Home)
                    Route(path: "detail/:id", component: Detail)
                }
            }) {
                Outlet {}
                SwipeBack {}
                AndroidPredictiveBack {}
            }
        }
    }
}
```

`Outlet` renders whichever screen the current state points to.
`SwipeBack` and `AndroidPredictiveBack` layer on native back gestures
— each is a no-op on the other platform, so pairing both is safe.

### Advanced: explicit handle

`Router` builds the `RouterHandle` for you from `routes`. If you need
the handle *before* the Router mounts — for example, to build a
navigation facade that a feature crate can call into — create it
manually with `RouterHandle::new(...)` and publish it with
`provide_router(handle)`:

```rust
let handle = RouterHandle::new(routes! { /* ... */ });
// use handle for pre-mount logic...
provide_router(handle);
```

## 4. Navigate

From any component inside the `Router`, call `use_navigator()` to get
the handle and navigate by URL:

```rust
#[component]
fn home() -> Element {
    let nav = use_navigator();
    render! {
        view(style: css!(
            flex_grow: 1.0,
            display: Display::Flex,
            flex_direction: FlexDirection::Column,
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
        )) {
            text(value: "Items")
            view(on_tap: move |_| {
                let _ = nav.navigate("/detail/1");
            }) {
                text(value: "Open item 1")
            }
            view(on_tap: move |_| {
                let _ = nav.navigate("/detail/2");
            }) {
                text(value: "Open item 2")
            }
        }
    }
}
```

The six navigation operations:

| Call | Effect |
|---|---|
| `nav.navigate("/detail/42")` | Push a new screen onto the active Stack |
| `nav.back()` | Pop the top of the deepest active Stack |
| `nav.select("/(home)")` | Switch a tab (change Switch branch) |
| `nav.replace("/other")` | Swap the top entry (same Stack only) |
| `nav.pop_to("/")` | Pop until the target is on top (same Stack only) |
| `nav.reset("/")` | **Global** — clear *every* back stack and go to the target (logout) |

All targets are plain URL strings. Dynamic `:param` segments are
extracted automatically by matching against the route tree.

`reset` is the odd one out: `replace` and `pop_to` only touch the current
Stack, but `reset` rebuilds the whole navigation state onto a single clean
path to the target — switching tabs toward it and clearing the back stack of
*every* Stack. A URL resolves to a **leaf screen**, and `/` is the home index
screen (reachable from any tab); group segments like `(home)` are optional.

## 5. Read route params

A component mounted under a `Route(path: "detail/:id", ...)` reads its
`:id` with `use_param`:

```rust
#[component]
fn detail() -> Element {
    let nav = use_navigator();
    let id = use_param("id");

    render! {
        view(style: css!(
            flex_grow: 1.0,
            display: Display::Flex,
            flex_direction: FlexDirection::Column,
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
        )) {
            text(value: format!("Detail #{}", id.get().unwrap_or_default()))
            view(on_tap: move |_| { let _ = nav.back(); }) {
                text(value: "Back")
            }
        }
    }
}
```

`use_param` returns a `ReadSignal<Option<String>>` that updates when
the route's params change.

## 6. Add tabs

Tabs use two additional concepts: **Switch** (a parallel container that
keeps all branches alive) and **layout routes** (a `Route` with both a
component and children).

```text
Route(component: TabsLayout)            ← layout: tab bar chrome + Outlet
  └─ Switch
       ├─ Route(path: "(home)")         ← group: no URL segment
       │    └─ Stack
       │         ├─ Route("", Home)
       │         └─ Route("detail/:id", Detail)
       └─ Route(path: "(search)")
            └─ Stack
                 ├─ Route("list", ListScreen)
                 └─ Route("detail/:id", Detail)
```

The tree declares a `Switch` inside a layout route. Each tab branch
has its own `Stack`, so each tab has independent push/pop history.

```rust
Router(routes: routes! {
    Route(component: TabsLayout) {
        Switch {
            Route(path: "(home)") {
                Stack {
                    Route(path: "", component: Home)
                    Route(path: "detail/:id", component: Detail)
                }
            }
            Route(path: "(search)") {
                Stack {
                    Route(path: "list", component: ListScreen)
                    Route(path: "detail/:id", component: Detail)
                }
            }
        }
    }
}) {
    Outlet {}
    SwipeBack {}
    AndroidPredictiveBack {}
}
```

### Layout routes

`Route(component: TabsLayout)` is a **layout route**: it has a
component *and* children. The component renders shared chrome (a tab
bar) with an `Outlet` for the active child. This is the same concept
as Expo Router's `_layout.tsx`.

```rust
#[component]
fn tabs_layout() -> Element {
    let nav = use_navigator();
    render! {
        view(style: css!(
            flex_grow: 1.0,
            display: Display::Flex,
            flex_direction: FlexDirection::Column,
        )) {
            // Content area
            view(style: css!(flex_grow: 1.0)) {
                Outlet {}
            }
            // Tab bar
            view(style: css!(
                display: Display::Flex,
                flex_direction: FlexDirection::Row,
                justify_content: JustifyContent::SpaceAround,
                height: px(56),
            )) {
                view(on_tap: move |_| { let _ = nav.select("/(home)"); }) {
                    text(value: "Home")
                }
                view(on_tap: {
                    let nav = nav.clone();
                    move |_| { let _ = nav.select("/(search)"); }
                }) {
                    text(value: "Search")
                }
            }
        }
    }
}
```

### Group routes

`Route(path: "(home)")` is a **group route** — the parenthesised path
appears in the canonical URL (`/(home)/detail/1`) but is **optional
during matching**. `navigate("/detail/1")` still matches because
`(home)` is skipped when absent from the input.

Group routes organize the tree (each is a Switch branch) without
forcing every URL to spell them out. Use `select("/(home)")` to
explicitly switch to a tab.

## Route nesting ≠ URL nesting

This is the most important concept to understand about the route tree.
Nesting a `Route` inside another `Route` creates a **layout
relationship**, not a pushable screen. The parent must render an
`Outlet` for the child to appear, and `back()` does not pop the child.

```rust
// WRONG — Detail is a child of Home (layout relationship).
// navigate() modifies the child state in-place; back() does not pop.
Stack {
    Route(path: "", component: Home) {
        Route(path: "detail/:id", component: Detail)
    }
}

// CORRECT — Home and Detail are siblings in the Stack.
// navigate() pushes Detail; back() pops to Home.
Stack {
    Route(path: "", component: Home)
    Route(path: "detail/:id", component: Detail)
}
```

To share a URL prefix among pushable screens, spell the full path on
each sibling:

```rust
Stack {
    Route(path: "settings", component: Settings)
    Route(path: "settings/account", component: Account)
    Route(path: "settings/privacy", component: Privacy)
}
```

Reserve `Route` nesting for layout routes (tab bars, headers, drawers)
where the parent renders shared UI around an `Outlet`.

## Run it

```bash
whisker run ios
```

Tap a row to push the detail screen with a native slide animation;
swipe from the left edge (or tap Back) to pop it. Push/pop history is
preserved per-tab.

## Next steps

- [Routing reference](/docs/routing-api) — every container type,
  transition, hook, and gesture.
- [Components & render!](/docs/components) — defining the screens you
  navigate between.
- [State Management](/docs/state-management) — the signals that drive
  reactive UI inside each screen.
