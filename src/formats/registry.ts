/**
 * Format registry - resolves a format name to its formatter instance.
 */

import type { ChangelogFormatter } from "./base.js";
import { keepAChangelogFormatter } from "./keep-a-changelog.js";
import { conventionalFormatter } from "./conventional.js";
import { createDwsmFormatter } from "./dwsm.js";

const FORMATTERS: Record<string, ChangelogFormatter> = {
  "keep-a-changelog": keepAChangelogFormatter,
  conventional: conventionalFormatter,
};

/**
 * Returns the formatter for the given format name.
 *
 * @param format - Format preset name from config
 * @returns The matching formatter
 * @throws {Error} If the format name is unknown
 */
export function getFormatter(format: string): ChangelogFormatter {
  if (format === "dwsm") {
    return createDwsmFormatter();
  }

  const formatter = FORMATTERS[format];
  if (!formatter) {
    const available = Object.keys(FORMATTERS).join(", ");
    throw new Error(
      `FEHLER: Unbekanntes Format "${format}".\n` +
        `Verfügbare Formate: ${available}, dwsm\n` +
        `Lösung: Prüfe das "format" Feld in .changelog-mcp.json.`
    );
  }

  return formatter;
}
