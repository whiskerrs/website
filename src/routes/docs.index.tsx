import { createFileRoute, redirect } from "@tanstack/react-router";

import { docs } from "@/lib/docs";

// /docs lands on the first documentation page.
export const Route = createFileRoute("/docs/")({
  beforeLoad: () => {
    if (docs.length > 0) {
      throw redirect({ to: "/docs/$slug", params: { slug: docs[0].slug } });
    }
  },
  component: () => null,
});
