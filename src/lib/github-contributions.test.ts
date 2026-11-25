import { describe, expect, test } from "vitest";

import { GITHUB_LOGIN, parseContributions } from "@/lib/github-contributions";

const fixture = `
<table class="ContributionCalendar-grid">
  <tbody>
    <tr>
      <td tabindex="0" data-ix="1" aria-selected="false" style="width: 10px" data-date="2025-11-30" id="contribution-day-component-0-1" data-level="2" role="gridcell" data-view-component="true" class="ContributionCalendar-day"></td>
      <td class="ContributionCalendar-day" data-level="0" id="contribution-day-component-0-0" data-date="2025-11-23" role="gridcell"></td>
      <td class="ContributionCalendar-label"><span>Mon</span></td>
      <td data-date="2025-12-07" id="contribution-day-component-0-2" data-level="4" class="ContributionCalendar-day"></td>
      <td data-date="2025-12-14" id="contribution-day-component-0-3" data-level="1" class="ContributionCalendar-day"></td>
    </tr>
  </tbody>
</table>
<tool-tip id="tooltip-a" for="contribution-day-component-0-1" popover="manual" data-direction="n" data-type="label" class="sr-only position-absolute">4 contributions on November 30th.</tool-tip>
<tool-tip for="contribution-day-component-0-0" id="tooltip-b" class="sr-only position-absolute">No contributions on November 23rd.</tool-tip>
<tool-tip class="sr-only" for="contribution-day-component-0-2" id="tooltip-c">1,234 contributions on December 7th.</tool-tip>
<tool-tip id="tooltip-d" for="contribution-day-component-0-3">1 contribution on December 14th.</tool-tip>
`;

describe("GitHub contribution calendar parser", () => {
  test("maps each day cell to its tooltip count, sorted by date", () => {
    expect(parseContributions(fixture)).toEqual([
      { date: "2025-11-23", count: 0 },
      { date: "2025-11-30", count: 4 },
      { date: "2025-12-07", count: 1234 },
      { date: "2025-12-14", count: 1 },
    ]);
  });

  test("unrecognised markup yields no days", () => {
    expect(parseContributions("<html><body>Not a calendar</body></html>")).toEqual([]);
  });

  test("login validation", () => {
    expect(GITHUB_LOGIN.test("itome")).toBe(true);
    expect(GITHUB_LOGIN.test("a-b-1")).toBe(true);
    expect(GITHUB_LOGIN.test("-abc")).toBe(false);
    expect(GITHUB_LOGIN.test("a".repeat(40))).toBe(false);
    expect(GITHUB_LOGIN.test("a/b")).toBe(false);
  });
});
