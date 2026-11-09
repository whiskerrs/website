import { docs, docSections, slugFromPath } from "@/lib/docs";

// The page sources as text, for the Markdown copies of the docs. Imported only
// by server routes so the raw text stays out of the client bundle.
const sources = import.meta.glob<string>("../content/docs/**/*.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

export function stripFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, "");
}

// `/docs/macros#render` -> `/docs/macros.md#render`, so an agent following a
// link from a Markdown page lands on another Markdown page.
export function linkToMarkdown(markdown: string) {
  return markdown.replace(/\]\(\/docs\/([a-z0-9-]+)(#[^)\s]*)?\)/g, "](/docs/$1.md$2)");
}

export const markdownBySlug = new Map(
  Object.entries(sources).map(([path, source]) => [
    slugFromPath(path),
    linkToMarkdown(stripFrontmatter(source)).trimEnd() + "\n",
  ]),
);

const SITE_SUMMARY =
  "Whisker is a Rust UI framework for iOS, Android, Web and desktop: an app is an ordinary Rust crate with `#[component]` functions built with `render!`, fine-grained signals, and a `whisker.rs` configuration file, driven by the `whisker` CLI.";

export function llmsTxt(origin: string) {
  const lines = [
    "# Whisker",
    "",
    `> ${SITE_SUMMARY}`,
    "",
    `Every page below is also served as Markdown at its URL plus \`.md\`. All pages in one file: ${origin}/llms-full.txt`,
  ];
  for (const section of docSections) {
    lines.push("", `## ${section.label}`, "");
    for (const doc of section.entries) {
      const description = doc.description ? `: ${doc.description}` : "";
      lines.push(`- [${doc.title}](${origin}/docs/${doc.slug}.md)${description}`);
    }
  }
  return lines.join("\n") + "\n";
}

export function llmsFullTxt() {
  return docs.map((doc) => markdownBySlug.get(doc.slug) ?? "").join("\n");
}
