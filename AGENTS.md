<!-- intent-skills:start -->
## Skill Loading

Before substantial work:
- Skill check: run `bunx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `bunx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Project Context

- Purpose: official website for Whisker.
- Scaffold command used exactly as requested:
  `npx @tanstack/cli@latest create my-tanstack-app --agent`
- CLI selections:
  React, file-router mode, npm package manager, default CLI toolchain `None`,
  Cloudflare deploy adapter, no demo/example pages, no add-ons, no nested git
  repository, install dependencies enabled.
- Package manager was changed to Bun after scaffolding at the user's request.
  Use `bun`, `bunx`, and `bun.lock` for ongoing project work; `package-lock.json`
  is intentionally not used.
- Follow-up TanStack Intent commands run:
  `npx @tanstack/intent@latest install`
  `npx @tanstack/intent@latest list`
- TanStack Intent skills loaded before project adjustments:
  `@tanstack/start-client-core#start-core`,
  `@tanstack/react-start#react-start`,
  `@tanstack/start-client-core#start-core/deployment`,
  `@tanstack/router-plugin#router-plugin`.

## Stack And Integrations

- TanStack Start with React and file-based routing.
- Bun package manager/runtime tooling.
- Tailwind CSS v4 via `@tailwindcss/vite` and `@import "tailwindcss"` in
  `src/styles.css`.
- Cloudflare Workers via `@cloudflare/vite-plugin`, `wrangler`, and
  `wrangler.jsonc`.
- Vite plugin order is intentional: devtools, Cloudflare, Tailwind,
  TanStack Start, then React.

## Environment And Deployment

- No application-specific environment variables are required yet.
- Client-exposed env vars must use Vite-safe public naming when added.
- For Cloudflare Worker runtime vars, prefer Cloudflare bindings. Do not rely
  on module-scope `process.env` for Worker runtime values.
- Secrets should be set with `wrangler secret put <NAME>`.
- Deploy with `bun run deploy`, which runs `bun run build` and then
  `wrangler deploy`.
- `wrangler.jsonc` uses `compatibility_flags: ["nodejs_compat"]`, which is
  required by the loaded TanStack Start deployment guidance.

## Architecture Notes

- Preserve the generated TanStack Start project structure unless there is a
  clear reason to change it.
- Generated route tree lives at `src/routeTree.gen.ts`; treat it as generated.
- `src/routes/__root.tsx` owns the document shell, stylesheet link,
  `HeadContent`, `Scripts`, and devtools.
- `src/routes/index.tsx` is intentionally minimal; no product feature
  scaffolding has been added.
- `tsconfig.json` sets `verbatimModuleSyntax` to `false` because the loaded
  TanStack Start guidance flags enabling it as a server/client bundling risk.
- `vite.config.ts` skips the Cloudflare Vite plugin in Vitest mode because the
  generated Cloudflare Worker SSR environment conflicts with Vitest's
  `resolve.external` startup defaults.

## Gotchas

- TanStack Start code is isomorphic by default. Server-only logic should use
  `createServerFn`, server files, or the relevant Start boundary APIs.
- Do not use Next.js or Remix patterns in this app.
- Keep `Scripts` in the root document body or hydration will fail.
- Before substantial TanStack-specific changes, run or consult
  `bunx @tanstack/intent@latest list` and load the matching local skill.
- `bun run test` currently uses `--passWithNoTests` because the blank starter
  has no test files yet.

## Next Steps

- Replace the placeholder home route with the first real Whisker website
  screen.
- Add production metadata, Open Graph data, favicon assets, and sitemap/robots
  routes when content requirements are known.
- Add Cloudflare environment bindings only when the app needs runtime config.
