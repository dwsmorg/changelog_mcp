/**
 * Changelog file parsing utilities.
 *
 * Reads and analyzes changelog files to extract version information
 * and determine where new entries should be inserted.
 */

import path from "node:path";
import { readFileContent } from "../utils/file.js";
import {
  validatePathWithinRoot,
  assertNotSymlink,
  assertFileSizeWithinLimit,
} from "../utils/security.js";
import type { Config } from "../config/types.js";
import { extractVersion, FALLBACK_VERSION } from "./version.js";

/** A single parsed changelog version block */
export interface ParsedEntry {
  /** Version number (e.g. "1.2.3") */
  version: string;
  /** Release date (e.g. "2026-02-11"), or empty string if not found */
  date: string;
  /** Full raw text of the version block (heading + content) */
  rawContent: string;
  /** Map of category name to list of descriptions */
  categories: Map<string, string[]>;
}

/**
 * Gets the current (latest) version from the changelog file.
 *
 * @param config - Active configuration
 * @returns Current version string, or FALLBACK_VERSION if not found
 */
export async function getCurrentVersion(config: Config): Promise<string> {
  const content = await getChangelogContent(config);

  if (content === null) {
    return FALLBACK_VERSION;
  }

  return extractVersion(content) ?? FALLBACK_VERSION;
}

/**
 * Reads the entire changelog file content.
 *
 * @param config - Active configuration
 * @returns File content as string, or null if file doesn't exist
 */
export async function getChangelogContent(
  config: Config
): Promise<string | null> {
  const changelogPath = resolveChangelogPath(config);
  await assertNotSymlink(changelogPath);
  await assertFileSizeWithinLimit(changelogPath);
  return readFileContent(changelogPath);
}

/**
 * Finds the position where a new entry should be inserted.
 *
 * For Keep a Changelog format, this is after the header and
 * before the first version section (## [X.Y.Z]).
 *
 * @param content - Current changelog content
 * @returns Character index where the new entry should be inserted
 */
export function findInsertPosition(content: string): number {
  // Match the first version heading: ## [X.Y.Z] or ## X.Y.Z
  const versionHeadingPattern = /^## \[?\d+\.\d+\.\d+\]?/m;
  const match = content.match(versionHeadingPattern);

  if (match && match.index !== undefined) {
    return match.index;
  }

  // No version heading found - insert after header
  // Look for the end of the header block (after "# Changelog" and any description)
  const headerPattern = /^# .+\n(?:\n(?!## ).*)*\n/m;
  const headerMatch = content.match(headerPattern);

  if (headerMatch && headerMatch.index !== undefined) {
    return headerMatch.index + headerMatch[0].length;
  }

  // Fallback: append at end
  return content.length;
}

/**
 * Resolves the absolute path to the changelog file.
 *
 * @param config - Active configuration
 * @returns Absolute file path
 */
export function resolveChangelogPath(config: Config): string {
  const resolved = path.resolve(
    process.cwd(),
    config.changelog.path,
    config.changelog.file
  );
  validatePathWithinRoot(resolved);
  return resolved;
}

/**
 * Resolves the absolute path to the backup directory.
 *
 * @param config - Active configuration
 * @returns Absolute directory path
 */
export function resolveBackupPath(config: Config): string {
  const resolved = path.resolve(process.cwd(), config.backup.path);
  validatePathWithinRoot(resolved);
  return resolved;
}

/**
 * Regex pattern that matches version headings across all supported formats:
 * - Keep a Changelog: `## [X.Y.Z] - YYYY-MM-DD`
 * - Conventional:     `## X.Y.Z (YYYY-MM-DD)`
 * - DWSM:            `vX.Y.Z (YYYY-MM-DD)`
 *
 * Capture groups: (1) version, (2) date (optional)
 */
const VERSION_BLOCK_PATTERN =
  /^(?:## \[(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})|## (\d+\.\d+\.\d+)\s*\((\d{4}-\d{2}-\d{2})\)|v(\d+\.\d+\.\d+)\s*\((\d{4}-\d{2}-\d{2})\))/gm;

/**
 * Parses changelog content into individual version entries.
 *
 * Supports all three format variants (Keep a Changelog, Conventional, DWSM).
 * Each entry contains the version, date, raw block text, and a map of
 * categories to their description lines.
 *
 * @param content - Full changelog file content
 * @returns Array of parsed entries, ordered as they appear in the file (newest first)
 */
export function parseEntries(content: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const headings: { version: string; date: string; startIndex: number }[] = [];

  // Find all version headings
  let match: RegExpExecArray | null;
  // Reset lastIndex for fresh search
  VERSION_BLOCK_PATTERN.lastIndex = 0;

  while ((match = VERSION_BLOCK_PATTERN.exec(content)) !== null) {
    // Groups from alternation: (1,2) keep-a-changelog, (3,4) conventional, (5,6) dwsm
    const version = match[1] ?? match[3] ?? match[5] ?? "";
    const date = match[2] ?? match[4] ?? match[6] ?? "";

    headings.push({ version, date, startIndex: match.index });
  }

  // Extract raw content blocks between headings
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].startIndex;
    const end = i + 1 < headings.length ? headings[i + 1].startIndex : content.length;
    const rawContent = content.slice(start, end).trimEnd();

    const categories = parseCategoriesFromBlock(rawContent);

    entries.push({
      version: headings[i].version,
      date: headings[i].date,
      rawContent,
      categories,
    });
  }

  return entries;
}

/**
 * Extracts category headings and their items from a version block.
 *
 * Looks for `### Category` headings followed by list items (`- ` or `* `).
 *
 * @param block - Raw text of a single version block
 * @returns Map of category names to arrays of item descriptions
 */
function parseCategoriesFromBlock(block: string): Map<string, string[]> {
  const categories = new Map<string, string[]>();
  const lines = block.split("\n");

  let currentCategory: string | null = null;

  for (const line of lines) {
    // Match category heading: ### Category
    const categoryMatch = line.match(/^### (.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      if (!categories.has(currentCategory)) {
        categories.set(currentCategory, []);
      }
      continue;
    }

    // Match list items: - text or * text (top-level only, not indented sub-items)
    const itemMatch = line.match(/^[-*] (.+)$/);
    if (itemMatch && currentCategory) {
      categories.get(currentCategory)!.push(itemMatch[1].trim());
    }
  }

  return categories;
}
