import { createFileRoute, notFound } from "@tanstack/react-router";

import { docsBySlug } from "@/lib/docs";

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => {
    if (!docsBySlug.has(params.slug)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const doc = docsBySlug.get(params.slug);
    return {
      meta: doc
        ? [
            { title: `${doc.title} · Whisker Docs` },
            ...(doc.description ? [{ name: "description", content: doc.description }] : []),
          ]
        : [],
    };
  },
  component: DocPage,
  notFoundComponent: () => (
    <div>
      <h1>Page not found</h1>
      <p>The document you are looking for does not exist.</p>
    </div>
  ),
});

function DocPage() {
  const { slug } = Route.useParams();
  const doc = docsBySlug.get(slug);

  if (!doc) {
    return null;
  }

  const Content = doc.Component;
  return <Content />;
}
