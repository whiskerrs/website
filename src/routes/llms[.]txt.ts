import { createFileRoute } from "@tanstack/react-router";

import { llmsTxt } from "@/lib/docs-markdown";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(llmsTxt(new URL(request.url).origin), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
