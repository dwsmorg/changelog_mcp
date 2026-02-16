/**
 * Search and get_entry tool handlers for the MCP server.
 *
 * Provides search_changelog for full-text / filter search
 * and get_entry for retrieving a complete version block.
 */

import { loadConfig } from "../config/loader.js";
import { getChangelogContent, parseEntries } from "../parser/changelog.js";
import type { ParsedEntry } from "../parser/changelog.js";
import type { ToolResponse } from "./types.js";

/**
 * Handles the search_changelog tool call.
 *
 * Filters changelog entries by query (full-text), version, and/or category.
 * At least one search parameter must be provided.
 *
 * @param query - Optional full-text search string (case-insensitive)
 * @param version - Optional version filter (exact or partial match)
 * @param category - Optional category filter (case-insensitive)
 * @param limit - Maximum number of results (default: 10)
 * @returns MCP response with formatted hit list
 */
export async function handleSearchChangelog(
  query?: string,
  version?: string,
  category?: string,
  limit: number = 10
): Promise<ToolResponse> {
  try {
    // Validate: at least one search parameter required
    if (!query && !version && !category) {
      return {
        content: [
          {
            type: "text",
            text:
              "FEHLER: Mindestens ein Suchparameter erforderlich.\n" +
              "Verfügbare Parameter: query, version, category\n" +
              "Lösung: Gib mindestens query, version oder category an.",
          },
        ],
        isError: true,
      };
    }

    const { config } = await loadConfig();
    const content = await getChangelogContent(config);

    if (content === null) {
      return {
        content: [
          {
            type: "text",
            text:
              "FEHLER: Keine Changelog-Datei gefunden.\n" +
              "Lösung: Erstelle zuerst ein Changelog mit init_changelog.",
          },
        ],
        isError: true,
      };
    }

    const entries = parseEntries(content);

    if (entries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Keine Versionseinträge im Changelog gefunden.",
          },
        ],
      };
    }

    // Filter entries
    const matches = entries.filter((entry) => matchesFilters(entry, query, version, category));
    const total = matches.length;
    const limited = matches.slice(0, limit);

    if (total === 0) {
      const filterParts: string[] = [];
      if (query) filterParts.push(`query="${query}"`);
      if (version) filterParts.push(`version="${version}"`);
      if (category) filterParts.push(`category="${category}"`);

      return {
        content: [
          {
            type: "text",
            text: `Keine Treffer für ${filterParts.join(", ")}.\n${entries.length} Einträge durchsucht.`,
          },
        ],
      };
    }

    // Format results
    const resultLines: string[] = [];
    resultLines.push(`Treffer: ${Math.min(limit, total)} von ${total} (Limit: ${limit})`);
    resultLines.push("");

    for (const entry of limited) {
      const summaries = formatEntrySummary(entry, category);
      for (const summary of summaries) {
        resultLines.push(summary);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: resultLines.join("\n"),
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

/**
 * Handles the get_entry tool call.
 *
 * Returns the complete raw content of a specific version block.
 *
 * @param version - Version number to look up (e.g. "1.2.3")
 * @returns MCP response with the full version block text
 */
export async function handleGetEntry(version: string): Promise<ToolResponse> {
  try {
    const { config } = await loadConfig();
    const content = await getChangelogContent(config);

    if (content === null) {
      return {
        content: [
          {
            type: "text",
            text:
              "FEHLER: Keine Changelog-Datei gefunden.\n" +
              "Lösung: Erstelle zuerst ein Changelog mit init_changelog.",
          },
        ],
        isError: true,
      };
    }

    const entries = parseEntries(content);
    const entry = entries.find((e) => e.version === version);

    if (!entry) {
      const available = entries.map((e) => e.version).join(", ");
      return {
        content: [
          {
            type: "text",
            text:
              `FEHLER: Version "${version}" nicht im Changelog gefunden.\n` +
              `Verfügbare Versionen: ${available || "(keine)"}\n` +
              `Lösung: Verwende eine der verfügbaren Versionen oder nutze search_changelog zur Suche.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: entry.rawContent,
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

/**
 * Checks whether a parsed entry matches all provided filters.
 *
 * @param entry - Parsed changelog entry
 * @param query - Optional full-text search (case-insensitive substring match on rawContent)
 * @param version - Optional version filter (exact or prefix match)
 * @param category - Optional category filter (case-insensitive)
 * @returns true if the entry matches all provided filters
 */
function matchesFilters(
  entry: ParsedEntry,
  query?: string,
  version?: string,
  category?: string
): boolean {
  if (query) {
    const lowerQuery = query.toLowerCase();
    if (!entry.rawContent.toLowerCase().includes(lowerQuery)) {
      return false;
    }
  }

  if (version) {
    if (!entry.version.startsWith(version)) {
      return false;
    }
  }

  if (category) {
    const lowerCategory = category.toLowerCase();
    const hasCategory = Array.from(entry.categories.keys()).some(
      (cat) => cat.toLowerCase() === lowerCategory
    );
    if (!hasCategory) {
      return false;
    }
  }

  return true;
}

/**
 * Formats a single entry into one or more summary lines for the hit list.
 *
 * If a category filter is active, only matching categories are shown.
 * Otherwise, all categories with their first item are shown.
 *
 * @param entry - Parsed changelog entry
 * @param categoryFilter - Optional category filter to narrow output
 * @returns Array of formatted summary strings
 */
function formatEntrySummary(entry: ParsedEntry, categoryFilter?: string): string[] {
  const lines: string[] = [];
  const dateStr = entry.date ? ` - ${entry.date}` : "";

  if (categoryFilter) {
    // Show only matching category items
    const lowerFilter = categoryFilter.toLowerCase();
    for (const [cat, items] of entry.categories) {
      if (cat.toLowerCase() === lowerFilter && items.length > 0) {
        lines.push(`[${entry.version}]${dateStr} | ${cat}: "${items[0]}"`);
      }
    }
  } else {
    // Show all categories with their first item
    for (const [cat, items] of entry.categories) {
      if (cat === "Files") continue; // Skip file listings in summary
      if (items.length > 0) {
        lines.push(`[${entry.version}]${dateStr} | ${cat}: "${items[0]}"`);
      }
    }
  }

  // Fallback if no categories matched
  if (lines.length === 0) {
    lines.push(`[${entry.version}]${dateStr}`);
  }

  return lines;
}
