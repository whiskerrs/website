import type { ComponentType } from "react";

type DocModule = {
  default: ComponentType;
  frontmatter?: {
    title?: string;
    description?: string;
    order?: number;
  };
};

// Eagerly bundle every Markdown/MDX file under src/content/docs,
// recursing into per-section subdirectories. The folder layout is:
//
//   src/content/docs/<NN>-<section>/<NN>-<page>.md
//
// e.g. `04-api-reference/02-macros.md` -> section "API Reference",
// page slug `macros`. Drop a new `.md` / `.mdx` file in a section
// folder and it shows up automatically, ordered by its `NN-` prefix.
const modules = import.meta.glob<DocModule>("../content/docs/**/*.{md,mdx}", {
  eager: true,
});

// Display labels + ordering for the known sections, keyed by the
// section folder's slug (the folder name with its `NN-` prefix
// stripped). Folders not listed here fall back to a title-cased label
// and sort after the known sections.
const SECTIONS: Record<string, { label: string; order: number }> = {
  "getting-started": { label: "Getting Started", order: 1 },
  "core-concepts": { label: "Core Concepts", order: 2 },
  guide: { label: "Guide", order: 3 },
  "api-reference": { label: "API Reference", order: 4 },
};

export type DocEntry = {
  slug: string;
  title: string;
  description?: string;
  order: number;
  section: string;
  sectionOrder: number;
  Component: ComponentType;
};

export type DocSection = {
  label: string;
  order: number;
  entries: DocEntry[];
};

// `../content/docs/04-api-reference/02-macros.md`
//   -> { dir: "04-api-reference", file: "02-macros" }
function pathParts(path: string) {
  const rel = path.replace(/^.*\/content\/docs\//, "");
  const segments = rel.replace(/\.(md|mdx)$/, "").split("/");
  const file = segments.pop()!;
  const dir = segments.pop() ?? "";
  return { dir, file };
}

// A leading `NN-` (or `NN_`) sets ordering and is stripped from the
// slug, so `02-macros` -> slug `macros`, order 2.
function stripOrderPrefix(name: string) {
  return name.replace(/^\d+[-_]/, "");
}

function prefixOrder(name: string) {
  const match = name.match(/^(\d+)[-_]/);
  return match ? Number(match[1]) : undefined;
}

function titleCase(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const docs: DocEntry[] = Object.entries(modules)
  .map(([path, mod]) => {
    const { dir, file } = pathParts(path);
    const fm = mod.frontmatter ?? {};
    const sectionSlug = stripOrderPrefix(dir);
    const known = SECTIONS[sectionSlug];
    return {
      slug: stripOrderPrefix(file),
      title: fm.title ?? titleCase(stripOrderPrefix(file)),
      description: fm.description,
      order: fm.order ?? prefixOrder(file) ?? 999,
      section: known?.label ?? titleCase(sectionSlug),
      sectionOrder: known?.order ?? prefixOrder(dir) ?? 999,
      Component: mod.default,
    };
  })
  .sort(
    (a, b) =>
      a.sectionOrder - b.sectionOrder ||
      a.order - b.order ||
      a.title.localeCompare(b.title),
  );

// Grouped by section, in section order, each section's entries in
// page order — the shape the docs sidebar renders.
export const docSections: DocSection[] = (() => {
  const bySection = new Map<string, DocSection>();
  for (const entry of docs) {
    let section = bySection.get(entry.section);
    if (!section) {
      section = { label: entry.section, order: entry.sectionOrder, entries: [] };
      bySection.set(entry.section, section);
    }
    section.entries.push(entry);
  }
  return [...bySection.values()].sort((a, b) => a.order - b.order);
})();

export const docsBySlug = new Map(docs.map((doc) => [doc.slug, doc]));
