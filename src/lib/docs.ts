import type { ComponentType } from "react";

type DocModule = {
  default: ComponentType;
  frontmatter?: {
    title?: string;
    description?: string;
    order?: number;
  };
};

// Eagerly bundle every Markdown/MDX file under src/content/docs.
// Drop a new `.md` / `.mdx` file in that folder and it shows up automatically.
const modules = import.meta.glob<DocModule>("../content/docs/*.{md,mdx}", {
  eager: true,
});

export type DocEntry = {
  slug: string;
  title: string;
  description?: string;
  order: number;
  Component: ComponentType;
};

function fileName(path: string) {
  return path.split("/").pop()!.replace(/\.(md|mdx)$/, "");
}

// A leading `NN-` (or `NN_`) sets ordering and is stripped from the slug,
// so `01-getting-started.md` -> slug `getting-started`, order 1.
function toSlug(name: string) {
  return name.replace(/^\d+[-_]/, "");
}

function prefixOrder(name: string) {
  const match = name.match(/^(\d+)[-_]/);
  return match ? Number(match[1]) : undefined;
}

export const docs: DocEntry[] = Object.entries(modules)
  .map(([path, mod]) => {
    const name = fileName(path);
    const fm = mod.frontmatter ?? {};
    const slug = toSlug(name);
    return {
      slug,
      title: fm.title ?? slug,
      description: fm.description,
      order: fm.order ?? prefixOrder(name) ?? 999,
      Component: mod.default,
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export const docsBySlug = new Map(docs.map((doc) => [doc.slug, doc]));
