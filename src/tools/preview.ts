/**
 * Preview tool handler for the MCP server.
 *
 * Provides a dry-run preview of how a changelog entry
 * would look without actually writing it.
 */

import { loadConfig } from "../config/loader.js";
import { getCurrentVersion } from "../parser/changelog.js";
import {
  bumpVersion,
  FALLBACK_VERSION,
  INITIAL_VERSION,
} from "../parser/version.js";
import { getFormatter } from "../formats/registry.js";
import type { ToolResponse } from "./types.js";

/**
 * Formats the current date as YYYY-MM-DD.
 */
function getFormattedDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Handles the preview_entry tool call.
 *
 * @param category - Entry category (e.g. "Added", "Fixed")
 * @param description - Main description of the change
 * @param details - Optional detail bullet points
 * @param files - Optional changed files
 * @param bump - Optional version bump type
 * @returns MCP response with the formatted preview
 */
export async function handlePreviewEntry(
  category: string,
  description: string,
  details?: string[],
  files?: string[],
  bump?: "major" | "minor" | "patch"
): Promise<ToolResponse> {
  try {
    const { config } = await loadConfig();
    const formatter = getFormatter(config.format);

    // Validate category
    if (!formatter.isValidCategory(category)) {
      return {
        content: [
          {
            type: "text",
            text:
              `FEHLER: Ungültige Kategorie "${category}".\n` +
              `Format: ${config.format}\n` +
              `Erlaubte Kategorien: ${formatter.getCategoryList()}\n` +
              `Lösung: Verwende eine der erlaubten Kategorien.`,
          },
        ],
        isError: true,
      };
    }

    // Calculate version
    const currentVersion = await getCurrentVersion(config);
    const effectiveBump = bump ?? "patch";

    let nextVersion: string;
    if (currentVersion === FALLBACK_VERSION) {
      nextVersion = INITIAL_VERSION;
    } else {
      nextVersion = bumpVersion(currentVersion, effectiveBump);
    }

    const date = getFormattedDate();
    const formatted = formatter.formatEntry({
      version: nextVersion,
      date,
      category,
      description,
      details,
      files,
    });

    return {
      content: [
        {
          type: "text",
          text:
            `--- Vorschau ---\n\n` +
            `${formatted}\n` +
            `--- Ende Vorschau ---\n\n` +
            `Version: ${currentVersion} → ${nextVersion} (${effectiveBump})\n` +
            `Hinweis: Nutze add_entry um diesen Eintrag zu schreiben.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    };
  }
}
