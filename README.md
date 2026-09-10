# Whisker Website

Official website scaffold for Whisker.

## Stack

- TanStack Start
- React
- Tailwind CSS v4
- Cloudflare Workers
- Bun

## Commands

```bash
bun run dev
bun run build
bun run test
bun run deploy
```

`bun run deploy` builds the app and deploys it with Wrangler.

## TanStack Intent

This project was scaffolded with:

```bash
npx @tanstack/cli@latest create my-tanstack-app --agent
```

After scaffolding, these commands were run:

```bash
npx @tanstack/intent@latest install
npx @tanstack/intent@latest list
```

The project now uses Bun. Before substantial TanStack-specific changes, load
the relevant local Intent skill as described in `AGENTS.md`.

## Environment

No application-specific environment variables are required yet.

For Cloudflare Workers, set secrets with:

```bash
bunx wrangler secret put NAME
```

Public Worker vars can be added to `wrangler.jsonc` under `vars` when needed.
Avoid module-scope `process.env` for Cloudflare runtime values.

## Deployment

Authenticate Wrangler before the first deploy:

```bash
bunx wrangler login
```

Then deploy:

```bash
bun run deploy
```

## Whisker Chat

The standalone Web app is served at `/examples/chat/`. Its production HTML,
JavaScript, and WebAssembly are checked into `public/examples/chat`, so normal
website builds and deployments do not require the Rust toolchain.

To refresh it from the adjacent Whisker checkout:

```bash
bun run update:chat
bun run build
```

An alternate checkout can be supplied with `bun run update:chat /path/to/whisker`.
The update command requires Whisker's Rust toolchain and the
`wasm32-unknown-unknown` target. It reads `web.base_path("/examples/chat/")` from Chat's `whisker.rs` and
copies the artifacts without modifying them. API keys are entered by visitors;
no credentials are needed for the build.

`public/_redirects` serves the app document for its setup, history, and settings
routes so direct links and reloads work on Cloudflare. Keep these entries aligned
with Chat's routes when adding screens. `public/_headers` requires revalidation
of the app's stable asset filenames. To test these hosting rules locally, use
`bunx wrangler dev --config dist/server/wrangler.json --local` after building the website.
