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

## Site Messaging Direction

- Make Rust the headline idea. The site should present Whisker as a
  major shift: write Android and iOS apps in Rust, with Web and desktop
  support planned.
- It is acceptable to use strong language around the Rust angle. The
  core claim is that writing mobile apps in Rust is the breakthrough:
  memory safety, native-grade performance, efficient memory use, fast
  startup, and smaller binaries compared with typical cross-platform
  stacks.
- Emphasize that Whisker lets developers write ergonomic UI with a
  Rust DSL rather than sacrificing developer experience for systems
  language benefits.
- Emphasize Rust safety explicitly: app code can be expressive while
  retaining Rust's safety guarantees.
- Explain that Whisker builds on Lynx, so developers can use a broad
  CSS surface directly, including layout and visual features such as
  grid and gradients.
- Emphasize hot reload as a first-class development experience:
  changes can be applied to the app in under one second for fast
  debugging and iteration.
- Emphasize Whisker Modules as the extension story: native APIs and
  native UI can be added through module crates that package Rust,
  Kotlin, and Swift together.
- Current status is pre-alpha. Keep strong product language, but avoid
  implying production readiness before the framework reaches that
  stage.

## Visual Direction

- Primary references: Astro and Tailwind CSS official sites.
- From Astro, borrow the clear developer-product landing structure:
  strong hero statement, command/code affordance, concise benefit
  sections, proof-oriented comparisons, ecosystem surface, and direct
  documentation calls to action.
- From Tailwind CSS, borrow the polished interactive/product feel:
  dense visual examples, code and UI previews side by side, crisp
  typography, confident copy, and feature sections that demonstrate
  concrete capabilities instead of merely describing them.
- For Whisker, adapt these references toward a systems/Rust/mobile
  identity: darker technical polish is acceptable, but avoid making
  the page feel like a generic SaaS marketing site.
- The first viewport should make the product unmistakable: Whisker,
  Rust, Android/iOS, and a visible Rust UI code example should all be
  immediately apparent.
- The current top page uses `public/screenshots/android.png` and
  `public/screenshots/ios.png` as mobile app examples from the user's
  Desktop. They are useful for visual direction, but replace or
  confirm rights-safe example content before a public launch if needed.

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
- `src/routes/index.tsx` contains the first Whisker landing page:
  Rust-first hero messaging, code preview, Android/iOS screenshots,
  feature sections for Rust advantages, the UI DSL, Lynx CSS support,
  hot reload, and Whisker Modules.
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

- Continue iterating the first real Whisker landing page in
  `src/routes/index.tsx`.
- Add production metadata, Open Graph data, favicon assets, and sitemap/robots
  routes when content requirements are known.
- Add Cloudflare environment bindings only when the app needs runtime config.
