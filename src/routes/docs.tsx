import { useRef } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { docSections } from "@/lib/docs";
import { TableOfContents } from "@/components/table-of-contents";
import { SiteHeader } from "@/components/site-header";

// Syntax-highlighting theme for fenced code blocks (applied by rehype-highlight).
import "highlight.js/styles/github-dark.css";

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

function DocsLayout() {
  const contentRef = useRef<HTMLElement | null>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-[#080b0f] text-slate-100">
      <SiteHeader section="Docs" />

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-12 xl:grid-cols-[220px_minmax(0,1fr)_200px]">
        <aside className="lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pb-10">
          <nav className="flex flex-col gap-5">
            {docSections.map((section) => (
              <div key={section.label} className="flex flex-col gap-1">
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {section.label}
                </p>
                {section.entries.map((doc) => (
                  <Link
                    key={doc.slug}
                    to="/docs/$slug"
                    params={{ slug: doc.slug }}
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100"
                    activeProps={{
                      className:
                        "bg-orange-300/10 text-orange-200 hover:bg-orange-300/10 hover:text-orange-200",
                    }}
                  >
                    {doc.title}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main
          ref={contentRef}
          className="prose prose-invert min-w-0 max-w-none prose-headings:scroll-mt-24 prose-a:text-orange-300 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none"
        >
          <Outlet />
        </main>

        <aside className="hidden xl:sticky xl:top-28 xl:block xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pb-10">
          <TableOfContents contentRef={contentRef} pathKey={pathname} />
        </aside>
      </div>
    </div>
  );
}
