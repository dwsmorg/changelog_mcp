/**
 * DWSM format implementation.
 *
 * Allows free-form categories and uses a fixed template:
 * v{{version}} ({{date}}) with ### category headers.
 */

import type { ChangelogFormatter, FormatEntryParams } from "./base.js";

/** Recommended categories for DWSM format (all categories are accepted) */
const RECOMMENDED_CATEGORIES = [
  "Added",
  "Changed",
  "Deprecated",
  "Removed",
  "Fixed",
  "Security",
  "Documentation",
];

/** DWSM format template */
const TEMPLATE = {
  header: "v{{version}} ({{date}})",
  category: "### {{category}}",
  item: "- {{description}}",
  detail: "  - {{detail}}",
  file: "  - `{{file}}`",
};

/**
 * Creates a DWSM formatter instance.
 *
 * All categories are allowed (no restrictions).
 *
 * @returns ChangelogFormatter instance
 */
export function createDwsmFormatter(): ChangelogFormatter {
  return {
    name: "dwsm",
    categories: [],
    defaultFile: "CHANGELOG.md",

    isValidCategory(): boolean {
      // All categories are valid in DWSM format
      return true;
    },

    getCategoryList(): string {
      return RECOMMENDED_CATEGORIES.join(", ");
    },

    formatEntry({ version, date, category, description, details, files }: FormatEntryParams): string {
      const lines: string[] = [];

      lines.push(
        TEMPLATE.header
          .replace("{{version}}", version)
          .replace("{{date}}", date)
      );
      lines.push("");
      lines.push(TEMPLATE.category.replace("{{category}}", category));
      lines.push(TEMPLATE.item.replace("{{description}}", description));

      if (details && details.length > 0) {
        for (const detail of details) {
          lines.push(TEMPLATE.detail.replace("{{detail}}", detail));
        }
      }

      if (files && files.length > 0) {
        lines.push("");
        lines.push("### Files");
        for (const file of files) {
          lines.push(TEMPLATE.file.replace("{{file}}", file));
        }
      }

      lines.push("");
      return lines.join("\n");
    },

    formatInitialChangelog(): string {
      return "# Changelog\n\n";
    },
  };
}
