import { createFileRoute } from "@tanstack/react-router";

import { markdownBySlug } from "@/lib/docs-markdown";

export const Route = createFileRoute("/docs/{$slug}.md")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const markdown = markdownBySlug.get(params.slug);
        if (markdown === undefined) {
          return new Response("Not found\n", { status: 404 });
        }
        return new Response(markdown, {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        });
      },
    },
  },
});
