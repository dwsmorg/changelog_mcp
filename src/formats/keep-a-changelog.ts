/**
 * Keep a Changelog format implementation.
 *
 * Follows the keepachangelog.com standard with categories:
 * Added, Changed, Deprecated, Removed, Fixed, Security.
 *
 * @see https://keepachangelog.com
 */

import type { ChangelogFormatter, FormatEntryParams } from "./base.js";

const CATEGORIES = [
  "Added",
  "Changed",
  "Deprecated",
  "Removed",
  "Fixed",
  "Security",
] as const;

export const keepAChangelogFormatter: ChangelogFormatter = {
  name: "keep-a-changelog",
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

    lines.push(`## [${version}] - ${date}`);
    lines.push("");
    lines.push(`### ${category}`);
    lines.push(`- ${description}`);

    if (details && details.length > 0) {
      for (const detail of details) {
        lines.push(`  - ${detail}`);
      }
    }

    if (files && files.length > 0) {
      lines.push("");
      lines.push("### Files");
      for (const file of files) {
        lines.push(`- ${file}`);
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
    lines.push("");
    lines.push("The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),");
    lines.push("and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).");
    lines.push("");
    return lines.join("\n");
  },
};
