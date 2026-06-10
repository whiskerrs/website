import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      ...(isTest ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
      tailwindcss(),
      // MDX must run before the React plugin so `.md`/`.mdx` compile to JS first.
      {
        enforce: "pre",
        ...mdx({
          mdExtensions: [".md"],
          mdxExtensions: [".mdx"],
          remarkPlugins: [
            remarkGfm,
            remarkFrontmatter,
            [remarkMdxFrontmatter, { name: "frontmatter" }],
          ],
          rehypePlugins: [
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "wrap" }],
            rehypeHighlight,
          ],
        }),
      },
      tanstackStart(),
      viteReact({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    ],
  };
});
