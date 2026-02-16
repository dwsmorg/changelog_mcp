/**
 * Auto-split logic for oversized changelog files.
 *
 * When a changelog exceeds the size limit, older entries are moved
 * to an archive file while recent entries remain in the main file.
 */

import path from "node:path";
import { writeFileContent, readFileContent } from "./file.js";
import { parseEntries } from "../parser/changelog.js";
import { validatePathWithinRoot, assertNotSymlink } from "./security.js";

/** Result of a changelog split operation */
export interface SplitResult {
  /** Absolute path to the created archive file */
  archivePath: string;
  /** Number of entries moved to the archive */
  entriesMoved: number;
  /** Number of entries kept in the main file */
  entriesKept: number;
}

/**
 * Splits an oversized changelog by moving older entries to an archive file.
 *
 * The newest 50% of entries stay in the main changelog, the oldest 50%
 * are moved to a dated archive file in the same directory.
 *
 * @param changelogPath - Absolute path to the changelog file
 * @returns Split result with archive path and entry counts
 * @throws {Error} If the file cannot be read or has fewer than 2 entries
 */
export async function splitChangelog(
  changelogPath: string
): Promise<SplitResult> {
  const content = await readFileContent(changelogPath);

  if (content === null) {
    throw new Error(
      `Split fehlgeschlagen: Changelog-Datei nicht gefunden.\nPfad: ${changelogPath}`
    );
  }

  const entries = parseEntries(content);

  if (entries.length < 2) {
    throw new Error(
      `Split fehlgeschlagen: Zu wenige Einträge (${entries.length}).\n` +
      `Mindestens 2 Einträge werden benötigt um aufzuteilen.`
    );
  }

  // Split: newest 50% stay, oldest 50% go to archive
  const splitIndex = Math.ceil(entries.length / 2);
  const keepEntries = entries.slice(0, splitIndex);
  const archiveEntries = entries.slice(splitIndex);

  // Build archive path
  const dir = path.dirname(changelogPath);
  const now = new Date();
  const dateStr =
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, "0")}` +
    `${String(now.getDate()).padStart(2, "0")}`;
  const archiveFileName = `CHANGELOG-archive-${dateStr}.md`;
  const archivePath = path.resolve(dir, archiveFileName);

  validatePathWithinRoot(archivePath);
  await assertNotSymlink(archivePath);

  // Build archive content
  const archiveContent =
    `# Changelog Archive (${dateStr})\n\n` +
    archiveEntries.map((e) => e.rawContent).join("\n\n") +
    "\n";

  // Build updated main content
  // Preserve header (everything before first entry)
  const firstEntryStart = entries[0].rawContent;
  const headerEndIndex = content.indexOf(firstEntryStart);
  const header = headerEndIndex > 0 ? content.slice(0, headerEndIndex) : "";

  const archiveComment = `<!-- Ältere Einträge: siehe ${archiveFileName} -->\n`;
  const mainContent =
    header +
    keepEntries.map((e) => e.rawContent).join("\n\n") +
    "\n\n" +
    archiveComment;

  // Write archive first, then update main file
  await writeFileContent(archivePath, archiveContent);
  await writeFileContent(changelogPath, mainContent);

  return {
    archivePath,
    entriesMoved: archiveEntries.length,
    entriesKept: keepEntries.length,
  };
}
