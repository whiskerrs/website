export type ContributionDay = { date: string; count: number };

export const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

function attributes(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const m of tag.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs.set(m[1].toLowerCase(), m[2] ?? m[3]);
  }
  return attrs;
}

function tooltipCount(text: string): number | undefined {
  const trimmed = text.trim();
  if (/^No contributions\b/i.test(trimmed)) return 0;
  const m = /^([\d,]+)\s+contributions?\b/i.exec(trimmed);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
}

export function parseContributions(html: string): ContributionDay[] {
  const dateById = new Map<string, string>();
  for (const [tag] of html.matchAll(/<td\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    const id = attrs.get("id");
    const date = attrs.get("data-date");
    const classes = (attrs.get("class") ?? "").split(/\s+/);
    if (
      id !== undefined &&
      date !== undefined &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      classes.includes("ContributionCalendar-day")
    ) {
      dateById.set(id, date);
    }
  }

  const countById = new Map<string, number>();
  for (const [, tag, text] of html.matchAll(/(<tool-tip\b[^>]*>)([\s\S]*?)<\/tool-tip>/gi)) {
    const id = attributes(tag).get("for");
    const count = tooltipCount(text);
    if (id !== undefined && count !== undefined) countById.set(id, count);
  }

  const days: ContributionDay[] = [];
  for (const [id, date] of dateById) {
    const count = countById.get(id);
    if (count !== undefined) days.push({ date, count });
  }
  return days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
