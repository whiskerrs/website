import { describe, expect, test } from "vitest";

import { docs } from "@/lib/docs";
import { linkToMarkdown, llmsTxt, markdownBySlug, stripFrontmatter } from "@/lib/docs-markdown";

describe("Markdown copies of the docs", () => {
  test("every page has a Markdown copy without frontmatter", () => {
    for (const doc of docs) {
      const markdown = markdownBySlug.get(doc.slug);
      expect(markdown, doc.slug).toBeDefined();
      expect(markdown!.startsWith("---"), doc.slug).toBe(false);
    }
  });

  test("frontmatter is removed and the body kept", () => {
    expect(stripFrontmatter("---\ntitle: A\norder: 1\n---\n\n# A\n")).toBe("# A\n");
    expect(stripFrontmatter("# No frontmatter\n")).toBe("# No frontmatter\n");
  });

  test("links between docs pages point at their Markdown copies", () => {
    expect(linkToMarkdown("[m](/docs/macros) [r](/docs/reactivity-api#computed)")).toBe(
      "[m](/docs/macros.md) [r](/docs/reactivity-api.md#computed)",
    );
    expect(linkToMarkdown("[x](https://example.com/docs/macros) [d](/docs)")).toBe(
      "[x](https://example.com/docs/macros) [d](/docs)",
    );
  });

  test("llms.txt lists every page by its absolute Markdown URL", () => {
    const text = llmsTxt("https://whisker.rs");
    expect(text.startsWith("# Whisker\n\n> ")).toBe(true);
    for (const doc of docs) {
      expect(text).toContain(`[${doc.title}](https://whisker.rs/docs/${doc.slug}.md)`);
    }
  });
});
