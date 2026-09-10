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

To refresh it, build Chat in the adjacent Whisker checkout and copy its output:

```bash
(cd ../whisker && cargo run -p whisker-cli --bin whisker -- build web --manifest-path examples/chat/Cargo.toml)
cp ../whisker/examples/chat/gen/web/dist/{index.html,whisker_app.js,whisker_app_bg.wasm} public/examples/chat/
bun run build
```

The deployment path is configured with `web.base_path("/examples/chat/")` in
Chat's `whisker.rs`. API keys are entered by visitors; no credentials are needed
for the build.

`public/_redirects` uses exact rules for the JavaScript and WebAssembly files
before the wildcard that serves the app document under `/examples/chat/`.
New screens need no additional rewrite rules. If the build adds or renames an
asset, update its exact rule too; otherwise the SPA fallback will serve HTML
instead of that asset. `public/_headers` requires
revalidation of the app's stable asset filenames. To test these hosting rules
locally, use `bunx wrangler dev --config dist/server/wrangler.json --local` after
building the website.
