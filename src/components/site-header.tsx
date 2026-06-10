import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";

// Shared top navigation used by both the landing page and the docs.
export function SiteHeader({ section }: { section?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080b0f]/85 text-slate-100 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/whisker_logo.png" alt="Whisker logo" className="size-8 object-contain" />
            <span>Whisker</span>
          </Link>
          {section ? (
            <span className="hidden items-center gap-2.5 sm:flex">
              <span className="text-slate-500" aria-hidden="true">
                /
              </span>
              <span className="text-slate-300">{section}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/docs"
            className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-300 transition hover:text-white"
            activeProps={{ className: "text-white" }}
          >
            Docs
          </Link>
          <a
            href="https://github.com/whiskerrs/whisker"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            <Github className="size-4" aria-hidden="true" />
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
