import { useRef } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { docs } from "@/lib/docs";
import { TableOfContents } from "@/components/table-of-contents";

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
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b0f]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold">
            <img src="/whisker_logo.png" alt="Whisker logo" className="size-8 object-contain" />
            <span>Whisker</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300">Docs</span>
          </Link>
          <a
            href="https://github.com/whiskerrs/whisker"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            GitHub
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-12 xl:grid-cols-[220px_minmax(0,1fr)_200px]">
        <aside className="lg:sticky lg:top-16 lg:-mt-12 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:py-12">
          <nav className="flex flex-col gap-1">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Documentation
            </p>
            {docs.map((doc) => (
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
          </nav>
        </aside>

        <main
          ref={contentRef}
          className="prose prose-invert min-w-0 max-w-none prose-headings:scroll-mt-24 prose-a:text-orange-300 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none"
        >
          <Outlet />
        </main>

        <aside className="hidden xl:sticky xl:top-16 xl:-mt-12 xl:block xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:py-12">
          <TableOfContents contentRef={contentRef} pathKey={pathname} />
        </aside>
      </div>
    </div>
  );
}
