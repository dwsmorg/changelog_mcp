/**
 * Conventional Changelog format implementation.
 *
 * Based on the Conventional Commits specification with categories:
 * Features, Bug Fixes, Performance, Reverts, Breaking Changes.
 *
 * @see https://www.conventionalcommits.org
 */

import type { ChangelogFormatter, FormatEntryParams } from "./base.js";

const CATEGORIES = [
  "Features",
  "Bug Fixes",
  "Performance",
  "Reverts",
  "Breaking Changes",
] as const;

export const conventionalFormatter: ChangelogFormatter = {
  name: "conventional",
  categories: CATEGORIES,
  defaultFile: "CHANGELOG.md",

  isValidCategory(category: string): boolean {
    return CATEGORIES.includes(category as (typeof CATEGORIES)[number]);
  },

  getCategoryList(): string {
    return CATEGORIES.join(", ");
  },

  formatEntry({ version, date, category, description, details, files }: FormatEntryParams): string {
    const lines: string[] = [];

    lines.push(`## ${version} (${date})`);
    lines.push("");
    lines.push(`### ${category}`);
    lines.push("");
    lines.push(`* ${description}`);

    if (details && details.length > 0) {
      for (const detail of details) {
        lines.push(`  * ${detail}`);
      }
    }

    if (files && files.length > 0) {
      lines.push("");
      lines.push("### Files");
      for (const file of files) {
        lines.push(`* **${file}**`);
      }
    }

    lines.push("");
    return lines.join("\n");
  },

  formatInitialChangelog(): string {
    const lines: string[] = [];
    lines.push("# Changelog");
    lines.push("");
    lines.push("All notable changes to this project will be documented in this file.");
    lines.push("See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.");
    lines.push("");
    return lines.join("\n");
  },
};
