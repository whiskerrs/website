---
title: Store Submission
description: Upload builds and manage store listings from the command line.
order: 7
---

# Store Submission

Once [`whisker build`](/docs/production-builds) has produced a signed artifact,
three commands take it the rest of the way. They talk to App Store Connect and
Google Play directly over their REST APIs — no Transporter, `altool`, or
fastlane.

| Command                                     | What it does                                                  |
| ------------------------------------------- | ------------------------------------------------------------- |
| `whisker submit ios` / `android`            | Uploads a binary, plus the release notes for that binary      |
| `whisker store push appstore` / `playstore` | Updates the store page: text, images, categories, review info |
| `whisker store pull appstore` / `playstore` | Prints what the store currently holds, as a `store.rs` file   |

The split follows lifetime. A release note describes one build; a description
outlives every build. Uploading a binary never rewrites your store page, and
updating your store page never needs a binary.

> **Status.** These commands are new. Uploading a bundle to Google Play,
> updating its listing text, and reading from both stores are exercised
> against a live app. Writing to App Store Connect, uploading an `.ipa`, and
> uploading images to either store are implemented from the stores' API
> references and have seen less use — run `store push` with `--dry-run` first.

## Before you start

Both stores need the app to exist already; neither API can create one.

- **App Store Connect** — add the app under **Apps → ＋ → New App** with your
  bundle id.
- **Google Play** — create the app in Play Console and upload its first build
  there by hand.

### Credentials

Credentials live in the same encrypted `credentials/` directory that
`whisker build` uses. If one is missing, the command that needs it starts the
setup wizard for you; in CI it stops and names the command to run locally.

**iOS** reuses the App Store Connect API key from `whisker credential ios`.
Nothing extra to set up.

**Android** needs a Google Cloud service account, because Google Play has no
API key you can create in Play Console:

```sh
whisker credential playstore
```

The wizard walks you through four steps and then validates the key:

1. Pick or create a Google Cloud project.
2. Enable the **Google Play Android Developer API** in it.
3. Create a service account and download a JSON key.
4. In Play Console, invite the service account's email under **Users and
   permissions** and grant it the **Releases** permissions for your app.

Already have a key? Skip the first three steps:

```sh
whisker credential playstore --import path/to/key.json
```

The key is stored as `credentials/android/default/playstore.json.age` and used
for every app in the repository. Pass `--id <application_id>` to store a key
for one app only.

## Uploading a build

`submit` uploads the artifact the last `whisker build` produced. It never
builds.

```sh
whisker build ipa
whisker submit ios

whisker build appbundle
whisker submit android
```

Pass `--path <file>` to upload a different artifact.

### iOS

`whisker submit ios` uploads the `.ipa` and waits for App Store Connect to
finish processing it — usually a few minutes. The build then appears in
TestFlight and can be attached to a version for review.

| Option      | Purpose                                        |
| ----------- | ---------------------------------------------- |
| `--path`    | Upload this `.ipa` instead of the last build's |
| `--no-wait` | Return as soon as the upload finishes          |

The bundle id and version numbers are read from the `.ipa` itself. An ad-hoc
or development-signed `.ipa` is rejected before anything is sent; rebuild with
`whisker build ipa --method app-store-connect`.

### Android

`whisker submit android` **only uploads** by default. The bundle lands in Play
Console's app bundle explorer and reaches nobody until you release it.

To create a release as well, name a track:

```sh
whisker submit android --track internal
whisker submit android --track production --draft
```

| Option           | Purpose                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| `--path`         | Upload this `.aab` instead of the last build's                               |
| `--track <name>` | Also release on `internal`, `alpha`, `beta`, `production`, or a custom track |
| `--draft`        | Create the release as a draft to roll out from Play Console                  |

An app that has never been published only accepts draft releases, so use
`--draft` until your first rollout.

Google Play rejects a `versionCode` it has seen before. Increase
`build_number` in `whisker.rs` and rebuild for every upload.

## Declaring store metadata: `store.rs`

Everything else the stores hold about your app is declared in `store.rs`, a
file next to `whisker.rs`. Like `whisker.rs`, it is a small Rust program:

```rust
fn main() {
    whisker::store::run(|store| {
        store.playstore(|p| {
            p.listing("en-US", |l| {
                l.title("Podcast")
                    .short_description("Listen anywhere")
                    .full_description(include_str!("metadata/en/description.txt"));
            });
            p.release(|r| {
                r.release_notes("en-US", include_str!("metadata/en/release_notes.txt"));
            });
        });

        store.appstore(|a| {
            a.app_info(|i| {
                i.primary_category("MUSIC");
                i.locale("en-US", |l| {
                    l.name("Podcast").subtitle("Listen anywhere");
                });
            });
            a.version(|v| {
                v.copyright("2026 Example Inc.");
                v.locale("en-US", |l| {
                    l.description(include_str!("metadata/en/description.txt"))
                        .keywords("podcast,audio,radio");
                });
            });
            a.beta_build(|b| {
                b.locale("en-US", |l| {
                    l.whats_new(include_str!("metadata/en/release_notes.txt"));
                });
            });
        });
    });
}
```

`store.rs` is optional. Without it, `submit` uploads the binary and nothing
else.

It is a separate file from `whisker.rs` on purpose: nothing in it reaches your
native project, so a typo in a description can never stop `whisker run`. It is
only built when you run `submit` or `store`.

### Each store is declared separately

There is no shared "app name" that goes to both stores. The stores differ in
what exists, what a value is attached to, and even how languages are spelled —
Japanese is `ja-JP` on Google Play and `ja` on the App Store. `store.rs`
mirrors each store's API instead: every block is one API resource, and every
setter is one of its attributes under the API's own name.

To share text between stores, share it in Rust — `include_str!` the same file
twice, or bind it to a variable.

See [Store Metadata](/docs/store-metadata) for every block and setter.

### Organizing the file

`store.rs` is ordinary Rust, so split it however you like:

```rust
mod appstore;  // appstore.rs, next to store.rs
mod playstore;

fn main() {
    whisker::store::run(|store| {
        playstore::configure(store);
        appstore::configure(store);
    });
}
```

`mod`, `#[path = "…"]`, and `include_str!` all resolve relative to `store.rs`.
Image paths are relative to your `Cargo.toml`.

### Editor support

`store.rs` needs no extra dependency — it uses the `whisker` crate your app
already has. To get completion in rust-analyzer, register it as a binary,
reusing the feature `whisker.rs` already has:

```toml
[[bin]]
name = "whisker-store"
path = "store.rs"
required-features = ["whisker-config"]
test = false
bench = false
```

This is optional; the CLI builds `store.rs` either way. With it registered you
can also print what the CLI will read:

```sh
cargo run --bin whisker-store --features whisker-config
```

## Starting from what the stores have

For an app that is already published, don't type its listing in by hand. Pull
it:

```sh
whisker store pull playstore > store.rs
```

`pull` reads everything `push` can write and prints a complete `store.rs`.
It changes nothing in the store. Progress goes to stderr, so the redirect
captures only the Rust source.

Pull each store separately and merge the two `store.…(|…| { … })` blocks into
one file:

```sh
whisker store pull appstore
```

For the App Store, `pull` reads the version you are preparing if there is one,
and the live version otherwise, and tells you which.

`pull` does not download images, and never prints a review demo account's
credentials.

## Updating the store page

```sh
whisker store push playstore --dry-run
whisker store push playstore
```

`--dry-run` lists what would be written without contacting the store. Run it
first.

`push` follows three rules:

- **Only what you set is sent.** An attribute you don't mention, or a language
  you don't declare, is left exactly as the store has it. Nothing is deleted
  because it is missing from `store.rs`.
- **Checked before sending.** Length limits, locale codes, and image files are
  validated before the first request.
- **Unchanged images are skipped.** Re-running a push uploads nothing if the
  images haven't changed.

### Google Play

All changes go into one transaction. If anything fails, the store page is left
untouched. Committed listing changes are reviewed by Google before they go
live.

### App Store

Most of what you declare belongs to **the version you are preparing** and goes
live when that version is released. If no version is in preparation, the push
stops before writing anything:

```sh
whisker store push appstore --create-version
```

`--create-version` creates the next version from `whisker.rs`'s `version`.

Your app's name, subtitle, and categories (`app_info`) can likewise only
change while a version is being prepared.

App Store Connect has no transactions, so `push` checks everything it can —
limits, locales, files, and that the app, version, and asset library exist —
before its first write.

## Images

### Google Play

```rust
store.playstore(|p| {
    p.images("en-US", |i| {
        i.icon("metadata/icon.png")
            .feature_graphic("metadata/feature.png")
            .phone_screenshots([
                "metadata/en/phone-1.png",
                "metadata/en/phone-2.png",
            ]);
    });
});
```

Each image type you declare is replaced with exactly the files you list, in
order. Types you don't declare are untouched. The language must already have a
listing — declare `p.listing(…)` for it with at least a title.

### App Store

The App Store keeps images in an **asset library**: upload an image once, then
_place_ it wherever it should appear.

```rust
store.appstore(|a| {
    a.asset_library(|lib| {
        lib.image("home", |i| {
            i.file("metadata/en/iphone-home.png");
        });
        lib.image("player", |i| {
            i.file("metadata/en/iphone-player.png");
        });
    });
    a.version(|v| {
        v.locale("en-US", |l| {
            l.placements(
                "APP_SCREENSHOT",
                "IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE",
                ["home", "player"],
            );
        });
    });
});
```

- The name you give an image (`"home"`) is how placements refer to it. Use
  letters, digits, `-`, `_`, and `.`.
- A placement names a **type** (`APP_SCREENSHOT`) and a **group** — a device
  family such as `IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE`. Apple adds groups as
  new devices ship; the current list is in App Store Connect's
  [asset library reference data](https://developer.apple.com/documentation/appstoreconnectapi/discovering-asset-specifications).
- One image can back placements in several languages.
- An image's dimensions must match one of Apple's specifications exactly.
  `push` waits for App Store Connect to accept each new image and stops with
  Apple's reason if one is rejected.
- An uploaded image can't be changed. If you edit the file, `push` uploads it
  as a new image and the old one stays in the library.

## What goes where

| In `store.rs`                                                                                                 | Sent by                                     |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `playstore.details`, `listing`, `images`                                                                      | `whisker store push playstore`              |
| `playstore.release`                                                                                           | `whisker submit android --track <name>`     |
| `appstore.app`, `app_info`, `asset_library`, `version`, `review_detail`, `beta_app`, `beta_app_review_detail` | `whisker store push appstore`               |
| `appstore.beta_build`                                                                                         | `whisker submit ios` (not with `--no-wait`) |

"What's new" text therefore lives in up to three places, because the stores
attach it to three different things: `playstore.release` (a Play release),
`appstore.beta_build` (a TestFlight build), and `appstore.version`'s
`whats_new` (an App Store version).

Release notes are skipped, with a warning, when there is nowhere to attach
them: `submit android` without `--track`, and `submit ios --no-wait`.

## In CI

Set `WHISKER_CREDENTIALS_KEY` and commit `credentials/`; the same commands
then run unattended. Wizards never run in CI — a missing credential is an
error that names the command to run locally.

## Not covered yet

- App preview videos.
- The App Store age rating declaration.
- A review demo account's user name and password. `store.rs` is plain text in
  your repository, so these are deliberately not settable there.
