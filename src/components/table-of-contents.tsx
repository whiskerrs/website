import { useEffect, useState, type RefObject } from "react";

type Heading = {
  id: string;
  text: string;
  level: number;
};

export function TableOfContents({
  contentRef,
  pathKey,
}: {
  contentRef: RefObject<HTMLElement | null>;
  pathKey: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Re-read headings whenever the rendered document changes.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) {
      return;
    }

    const nodes = Array.from(root.querySelectorAll("h2[id], h3[id]"));
    setHeadings(
      nodes.map((node) => ({
        id: node.id,
        text: node.textContent ?? "",
        level: Number(node.tagName[1]),
      })),
    );
  }, [contentRef, pathKey]);

  // Highlight the heading currently in view.
  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) {
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        On this page
      </p>
      <ul className="flex flex-col gap-1 border-l border-white/10">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`-ml-px block border-l py-1 transition ${
                  heading.level === 3 ? "pl-6" : "pl-3"
                } ${
                  active
                    ? "border-orange-300 text-orange-200"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
