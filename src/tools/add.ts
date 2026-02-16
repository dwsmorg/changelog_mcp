/**
 * Add entry tool handler for the MCP server.
 *
 * Implements the append-only write operation with the full
 * safety chain: config → backup → read → format → prepend → write → verify.
 */

import { loadConfig } from "../config/loader.js";
import {
  getCurrentVersion,
  getChangelogContent,
  findInsertPosition,
  resolveChangelogPath,
  resolveBackupPath,
} from "../parser/changelog.js";
import {
  bumpVersion,
  FALLBACK_VERSION,
  INITIAL_VERSION,
} from "../parser/version.js";
import { getFormatter } from "../formats/registry.js";
import { createBackup } from "../utils/backup.js";
import {
  writeFileContent,
  getFileSize,
  fileExists,
} from "../utils/file.js";
import { assertNotSymlink, MAX_CHANGELOG_SIZE } from "../utils/security.js";
import { splitChangelog } from "../utils/split.js";
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
 * Handles the add_entry tool call.
 *
 * Safety chain:
 * 1. Load and validate config
 * 2. Create backup (if enabled)
 * 3. Read current changelog content
 * 4. Format new entry
 * 5. Insert entry at correct position (prepend)
 * 6. Write updated content
 * 7. Verify file size (new >= old)
 *
 * @param category - Entry category (e.g. "Added", "Fixed")
 * @param description - Main description of the change
 * @param details - Optional detail bullet points
 * @param files - Optional changed files
 * @param bump - Optional version bump type
 * @returns MCP response with confirmation
 */
export async function handleAddEntry(
  category: string,
  description: string,
  details?: string[],
  files?: string[],
  bump?: "major" | "minor" | "patch"
): Promise<ToolResponse> {
  try {
    // 1. Load config
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

    const changelogPath = resolveChangelogPath(config);

    // Security: symlink check before any file operations
    await assertNotSymlink(changelogPath);

    // 2. Create backup
    if (config.backup.enabled && (await fileExists(changelogPath))) {
      const backupDir = resolveBackupPath(config);
      try {
        await createBackup(
          changelogPath,
          backupDir,
          config.backup.strategy,
          config.backup.maxFiles
        );
      } catch (backupError) {
        // Backup failure is a warning, not a blocker
        process.stderr.write(
          `Warnung: Backup konnte nicht erstellt werden: ${backupError}\n`
        );
      }
    }

    // 3. Read current content
    const oldSize = await getFileSize(changelogPath);
    let content = await getChangelogContent(config);

    // If no changelog exists, create initial template
    if (content === null) {
      content = formatter.formatInitialChangelog();
    }

    // 4. Calculate version and format entry
    const currentVersion = await getCurrentVersion(config);
    const effectiveBump = bump ?? "patch";

    let nextVersion: string;
    if (currentVersion === FALLBACK_VERSION) {
      nextVersion = INITIAL_VERSION;
    } else {
      nextVersion = bumpVersion(currentVersion, effectiveBump);
    }

    const date = getFormattedDate();
    const entry = formatter.formatEntry({
      version: nextVersion,
      date,
      category,
      description,
      details,
      files,
    });

    // 5. Insert entry at correct position (with configurable spacing)
    const insertPos = findInsertPosition(content);
    const spacing = "\n".repeat(config.changelog.entrySpacing);
    const newContent =
      content.slice(0, insertPos) + entry + spacing + content.slice(insertPos);

    // 6. Write updated content
    await writeFileContent(
      changelogPath,
      newContent,
      config.changelog.encoding as BufferEncoding
    );

    // 7. Verify file size
    const newSize = await getFileSize(changelogPath);
    let sizeWarning = "";

    if (oldSize > 0 && newSize < oldSize) {
      sizeWarning =
        `\n\nWARNUNG: Die neue Datei (${newSize} Bytes) ist kleiner als die alte (${oldSize} Bytes). ` +
        `Dies könnte auf Datenverlust hindeuten. Prüfe das Backup-Verzeichnis.`;
    }

    // 8. Auto-split if changelog exceeds size limit
    let splitInfo = "";
    if (newSize > MAX_CHANGELOG_SIZE) {
      try {
        const result = await splitChangelog(changelogPath);
        splitInfo =
          `\n\nAuto-Split durchgeführt: ${result.entriesMoved} Einträge nach ${result.archivePath} verschoben, ` +
          `${result.entriesKept} Einträge behalten.`;
      } catch (splitError) {
        splitInfo =
          `\n\nWARNUNG: Auto-Split fehlgeschlagen: ${splitError instanceof Error ? splitError.message : String(splitError)}`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Changelog-Eintrag erfolgreich hinzugefügt.\n` +
            `Version: ${nextVersion}\n` +
            `Kategorie: ${category}\n` +
            `Datei: ${changelogPath}${sizeWarning}${splitInfo}`,
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
