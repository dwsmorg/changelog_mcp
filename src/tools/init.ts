/**
 * Init tool handler for the MCP server.
 *
 * Creates a new changelog file and optionally a .changelog-mcp.json config.
 */

import path from "node:path";
import { loadConfig } from "../config/loader.js";
import { CONFIG_FILENAMES } from "../config/defaults.js";
import { resolveChangelogPath } from "../parser/changelog.js";
import { getFormatter } from "../formats/registry.js";
import { writeFileContent, fileExists } from "../utils/file.js";
import { validateFilename, validatePathWithinRoot } from "../utils/security.js";
import type { ToolResponse } from "./types.js";

/**
 * Handles the init_changelog tool call.
 *
 * @param format - Optional format preset (default from config)
 * @param file - Optional changelog filename (default from config)
 * @returns MCP response with confirmation
 */
export async function handleInitChangelog(
  format?: string,
  file?: string
): Promise<ToolResponse> {
  try {
    const { config, isDefault } = await loadConfig();

    const effectiveFormat = format ?? config.format;
    const formatter = getFormatter(effectiveFormat);
    const effectiveFile = file ?? config.changelog.file;

    // Security: validate filename before path resolution
    validateFilename(effectiveFile);

    const changelogPath = path.resolve(
      process.cwd(),
      config.changelog.path,
      effectiveFile
    );

    // Security: ensure resolved path stays within project
    validatePathWithinRoot(changelogPath);

    // Check if changelog already exists
    if (await fileExists(changelogPath)) {
      return {
        content: [
          {
            type: "text",
            text:
              `FEHLER: Changelog-Datei existiert bereits.\n` +
              `Pfad: ${changelogPath}\n` +
              `Lösung: Lösche die Datei manuell oder nutze add_entry um Einträge hinzuzufügen.`,
          },
        ],
        isError: true,
      };
    }

    // Create changelog
    const initialContent = formatter.formatInitialChangelog();
    await writeFileContent(changelogPath, initialContent);

    const created: string[] = [`Changelog: ${changelogPath}`];

    // Create config if none exists
    if (isDefault) {
      const configPath = path.resolve(process.cwd(), CONFIG_FILENAMES[0]);

      if (!(await fileExists(configPath))) {
        const configContent = JSON.stringify(
          {
            format: effectiveFormat,
            changelog: {
              file: effectiveFile,
              path: config.changelog.path,
              encoding: config.changelog.encoding,
            },
            backup: config.backup,
            versioning: config.versioning,
          },
          null,
          2
        );

        await writeFileContent(configPath, configContent + "\n");
        created.push(`Config: ${configPath}`);
      }
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Changelog erfolgreich initialisiert.\n` +
            `Format: ${effectiveFormat}\n` +
            `Kategorien: ${formatter.getCategoryList()}\n\n` +
            `Erstellt:\n` +
            created.map((c) => `  - ${c}`).join("\n") +
            `\n\nNutze add_entry um den ersten Eintrag zu erstellen.`,
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
