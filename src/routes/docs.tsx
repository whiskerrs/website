import { useRef, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { docSections, docsBySlug } from "@/lib/docs";
import { TableOfContents } from "@/components/table-of-contents";
import { SiteHeader } from "@/components/site-header";

// Syntax-highlighting theme for fenced code blocks (applied by rehype-highlight).
import "highlight.js/styles/github-dark.css";

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

// Section-grouped navigation, shared by the desktop sidebar and the
// mobile drawer. `onNavigate` lets the mobile drawer close itself when a
// link is followed.
function SectionNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-9">
      {docSections.map((section, i) => (
        <div
          key={section.label}
          className={
            i === 0
              ? "flex flex-col gap-1"
              : "flex flex-col gap-1 border-t border-white/[0.06] pt-7"
          }
        >
          <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {section.label}
          </p>
          {section.entries.map((doc) => (
            <Link
              key={doc.slug}
              to="/docs/$slug"
              params={{ slug: doc.slug }}
              onClick={onNavigate}
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
  );
}

function DocsLayout() {
  const contentRef = useRef<HTMLElement | null>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentSlug = pathname.replace(/^\/docs\/?/, "");
  const currentTitle = docsBySlug.get(currentSlug)?.title ?? "Documentation";

  return (
    <div className="min-h-screen bg-[#080b0f] text-slate-100">
      <SiteHeader section="Docs" />

      {/* Mobile / tablet nav: a disclosure under the header. Hidden at lg+
          where the persistent sidebar takes over. */}
      <div className="sticky top-16 z-20 border-b border-white/10 bg-[#080b0f]/90 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-expanded={mobileNavOpen}
            aria-controls="docs-mobile-nav"
            className="flex w-full items-center justify-between gap-3 py-3.5 text-sm font-medium text-slate-300"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 shrink-0 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="truncate">{currentTitle}</span>
            </span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`size-4 shrink-0 text-slate-500 transition-transform ${
                mobileNavOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {mobileNavOpen ? (
            <div
              id="docs-mobile-nav"
              className="max-h-[70vh] overflow-y-auto overscroll-contain pb-6"
            >
              <SectionNav onNavigate={() => setMobileNavOpen(false)} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 pt-10 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:px-12 lg:pt-12 xl:grid-cols-[220px_minmax(0,1fr)_200px]">
        <aside className="hidden lg:sticky lg:top-[113px] lg:block lg:h-[calc(100dvh-113px)] lg:overflow-y-auto lg:overscroll-contain lg:pb-6">
          <SectionNav />
        </aside>

        <main
          ref={contentRef}
          className="prose prose-invert min-w-0 max-w-none pb-16 prose-headings:scroll-mt-24 prose-pre:max-w-full prose-pre:overflow-x-auto prose-a:text-orange-300 prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none"
        >
          <Outlet />
        </main>

        <aside className="hidden xl:sticky xl:top-[113px] xl:block xl:h-[calc(100dvh-113px)] xl:overflow-y-auto xl:overscroll-contain xl:pb-6">
          <TableOfContents contentRef={contentRef} pathKey={pathname} />
        </aside>
      </div>
    </div>
  );
}
