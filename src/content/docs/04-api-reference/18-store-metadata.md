---
title: Store Metadata
description: The blocks and setters available in store.rs.
order: 18
---

# API Reference: Store Metadata

`store.rs` is an optional binary next to `whisker.rs` whose `main` calls
`whisker::store::run`. The closure receives a `StoreConfig`; when it returns,
the configuration is handed to the CLI command that launched it. For the
workflow, see [Store Submission](/docs/store-submission).

```rust
fn main() {
    whisker::store::run(|store| {
        store.playstore(|p| { /* Google Play */ });
        store.appstore(|a| { /* App Store Connect */ });
    });
}
```

The types come from `whisker-config` and are re-exported as `whisker::store`.

## Conventions

- **Blocks mirror API resources.** Each block is one resource of the store's
  API, and each setter is one of its attributes in `snake_case`. The stores'
  API references apply directly.
- **Everything is optional.** Only attributes you set are sent. An unset
  attribute, an undeclared language, or an undeclared image type is left as
  the store has it.
- **Setters chain.** Every setter returns `&mut Self`.
- **Languages use each store's own codes** — `ja-JP` on Google Play, `ja` on
  the App Store.
- **Paths** to image files are relative to the app's `Cargo.toml`.

The **Sent by** column says which command sends a block.

## `store.playstore`

| Block                  | API resource           | Sent by                         |
| ---------------------- | ---------------------- | ------------------------------- |
| `details(\|d\| …)`     | `edits.details`        | `store push playstore`          |
| `listing(language, …)` | `edits.listings`       | `store push playstore`          |
| `images(language, …)`  | `edits.images`         | `store push playstore`          |
| `release(\|r\| …)`     | `edits.tracks` release | `submit android --track <name>` |

### `details`

| Setter             | Notes                        |
| ------------------ | ---------------------------- |
| `default_language` | A Play language code         |
| `contact_email`    | Support email shown to users |
| `contact_phone`    | Support phone shown to users |
| `contact_website`  | Website shown to users       |

### `listing(language, …)`

| Setter              | Limit           |
| ------------------- | --------------- |
| `title`             | 30 characters   |
| `short_description` | 80 characters   |
| `full_description`  | 4000 characters |
| `video`             | A YouTube URL   |

### `images(language, …)`

Each type you set replaces what Google Play has for it. The language must
already have a listing.

| Setter                   | Takes                 |
| ------------------------ | --------------------- |
| `icon`                   | one file              |
| `feature_graphic`        | one file              |
| `tv_banner`              | one file              |
| `phone_screenshots`      | files, in order (≤ 8) |
| `seven_inch_screenshots` | files, in order (≤ 8) |
| `ten_inch_screenshots`   | files, in order (≤ 8) |
| `tv_screenshots`         | files, in order (≤ 8) |
| `wear_screenshots`       | files, in order (≤ 8) |

Files must be `.png`, `.jpg`, or `.jpeg`. Passing an empty list removes that
type's images.

### `release`

| Setter                          | Limit          |
| ------------------------------- | -------------- |
| `release_notes(language, text)` | 500 characters |

Call it once per language.

## `store.appstore`

| Block                             | API resource             | Attached to                | Sent by               |
| --------------------------------- | ------------------------ | -------------------------- | --------------------- |
| `app(\|app\| …)`                  | `apps`                   | the app                    | `store push appstore` |
| `app_info(\|i\| …)`               | `appInfos`               | the app¹                   | `store push appstore` |
| `asset_library(\|lib\| …)`        | `appAssetLibraries`      | the app                    | `store push appstore` |
| `version(\|v\| …)`                | `appStoreVersions`       | the version in preparation | `store push appstore` |
| `review_detail(\|r\| …)`          | `appStoreReviewDetails`  | the version in preparation | `store push appstore` |
| `beta_app(\|b\| …)`               | `betaAppLocalizations`   | the app                    | `store push appstore` |
| `beta_app_review_detail(\|r\| …)` | `betaAppReviewDetails`   | the app                    | `store push appstore` |
| `beta_build(\|b\| …)`             | `betaBuildLocalizations` | one TestFlight build       | `submit ios`          |

¹ App Store Connect only accepts changes to app info while a version is being
prepared, and they go live with that version.

### `app`

| Setter                       | Values                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| `content_rights_declaration` | `DOES_NOT_USE_THIRD_PARTY_CONTENT`, `USES_THIRD_PARTY_CONTENT` |
| `primary_locale`             | An App Store locale                                            |

### `app_info`

| Setter                      | Notes                                         |
| --------------------------- | --------------------------------------------- |
| `primary_category`          | A category id such as `BOOKS` or `GAMES`      |
| `primary_subcategory_one`   |                                               |
| `primary_subcategory_two`   |                                               |
| `secondary_category`        |                                               |
| `secondary_subcategory_one` |                                               |
| `secondary_subcategory_two` |                                               |
| `locale(locale, …)`         | `appInfoLocalizations` for one locale (below) |

| Setter (inside `locale`) | Limit           |
| ------------------------ | --------------- |
| `name`                   | 2–30 characters |
| `subtitle`               | 30 characters   |
| `privacy_policy_url`     |                 |
| `privacy_choices_url`    |                 |
| `privacy_policy_text`    | tvOS only       |

### `asset_library`

| Setter                     | Notes                                     |
| -------------------------- | ----------------------------------------- |
| `image(reference_name, …)` | One `appAssetLibraryImages` entry (below) |

The reference name identifies the image and is how placements refer to it. It
may contain letters, digits, `-`, `_`, and `.`.

| Setter (inside `image`) | Notes                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `file`                  | Required. `.png`, `.jpg`, or `.jpeg`, matching an Apple image specification exactly |
| `category`              | `APP_SCREENSHOTS_AND_PREVIEWS` (default) or `CREATIVE_ASSETS`                       |

### `version`

| Setter                  | Notes                                                 |
| ----------------------- | ----------------------------------------------------- |
| `copyright`             |                                                       |
| `release_type`          | `MANUAL`, `AFTER_APPROVAL`, or `SCHEDULED`            |
| `earliest_release_date` | RFC 3339 date-time, for `SCHEDULED`                   |
| `locale(locale, …)`     | `appStoreVersionLocalizations` for one locale (below) |

| Setter (inside `locale`)           | Limit                                        |
| ---------------------------------- | -------------------------------------------- |
| `description`                      | 4000 characters                              |
| `keywords`                         | 100 bytes, comma-separated                   |
| `whats_new`                        | 4000 characters; rejected on a first version |
| `promotional_text`                 | 170 characters                               |
| `marketing_url`                    |                                              |
| `support_url`                      |                                              |
| `placements(type, group, [names])` | Asset library images to show, in order       |

`placements` makes one placement type (such as `APP_SCREENSHOT`) and group (a
device family such as `IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE`) show exactly the
named images. Groups you don't declare are untouched. Group names are passed
to App Store Connect as written.

### `review_detail` and `beta_app_review_detail`

Both take the same setters.

| Setter                  | Notes                                   |
| ----------------------- | --------------------------------------- |
| `contact_first_name`    |                                         |
| `contact_last_name`     |                                         |
| `contact_phone`         | International format with a leading `+` |
| `contact_email`         |                                         |
| `demo_account_required` | `bool`                                  |
| `notes`                 | 4000 bytes                              |

The demo account's user name and password are not settable: `store.rs` is
plain text in your repository.

### `beta_app`

| Setter              | Notes                                         |
| ------------------- | --------------------------------------------- |
| `locale(locale, …)` | `betaAppLocalizations` for one locale (below) |

| Setter (inside `locale`) |
| ------------------------ |
| `description`            |
| `feedback_email`         |
| `marketing_url`          |
| `privacy_policy_url`     |
| `tv_os_privacy_policy`   |

### `beta_build`

| Setter              | Notes                                           |
| ------------------- | ----------------------------------------------- |
| `locale(locale, …)` | `betaBuildLocalizations` for one locale (below) |

| Setter (inside `locale`) | Notes                                         |
| ------------------------ | --------------------------------------------- |
| `whats_new`              | TestFlight's "What to Test" (4000 characters) |

## Validation

Before contacting a store, the CLI rejects:

- text over a limit listed above;
- a language or reference name declared twice in the same block;
- an App Store locale that is not one of App Store Connect's codes;
- an image file that is missing or not `.png` / `.jpg` / `.jpeg`;
- a placement that names an image `asset_library` does not declare.

Google Play language codes and App Store placement groups are not checked
locally; the store reports an invalid one.
