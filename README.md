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
