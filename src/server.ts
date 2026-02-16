/**
 * MCP Server setup and tool registration.
 *
 * Creates the McpServer instance, registers all tools with
 * their Zod parameter schemas, and exports for connection.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { handleGetCurrentVersion, handleGetNextVersion } from "./tools/version.js";
import { handlePreviewEntry } from "./tools/preview.js";
import { handleAddEntry } from "./tools/add.js";
import { handleGetConfig } from "./tools/config.js";
import { handleInitChangelog } from "./tools/init.js";
import { handleSearchChangelog, handleGetEntry } from "./tools/search.js";
import { loadConfig } from "./config/loader.js";
import { getFormatter } from "./formats/registry.js";
import { isSafeFilename } from "./utils/security.js";

const SERVER_NAME = "changelog";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "..", "package.json"), "utf-8")
) as { version: string };
const SERVER_VERSION = pkg.version;

const SERVER_INSTRUCTIONS = `Du hast Zugriff auf einen Changelog MCP Server. Nutze diese Tools um Changelog-Einträge zu verwalten:

- Nutze init_changelog um ein neues Changelog und eine Config-Datei zu erstellen
- Nach jeder abgeschlossenen Code-Änderung: Nutze add_entry um einen Changelog-Eintrag zu erstellen
- Vor add_entry: Nutze preview_entry um den Eintrag zu prüfen
- Nutze get_current_version um die aktuelle Version zu erfahren
- Nutze get_next_version um die nächste Version zu berechnen
- Nutze search_changelog um das Changelog zu durchsuchen (Freitext, Version, Kategorie)
- Nutze get_entry um den vollständigen Block einer bestimmten Version abzurufen
- Bearbeite die Changelog-Datei NIEMALS direkt - nutze immer die MCP Tools
- Wähle die passende Kategorie basierend auf der Art der Änderung`;

/**
 * Builds the category description string for tool parameters.
 *
 * @param categoryList - Comma-separated list of valid categories
 * @param allAllowed - Whether any category is accepted
 * @returns Description string for the category parameter
 */
function buildCategoryDescription(
  categoryList: string,
  allAllowed: boolean
): string {
  if (allAllowed) {
    return `Kategorie des Eintrags (frei wählbar, auch eigene erlaubt). Empfohlen: ${categoryList}`;
  }
  return `Kategorie des Eintrags. Erlaubte Werte: ${categoryList}`;
}

/**
 * Creates and configures the MCP server with all tools.
 *
 * Loads the config at startup to determine the active format
 * and dynamically set category descriptions for tools.
 *
 * @returns Configured McpServer instance
 */
export async function createServer(): Promise<McpServer> {
  // Load config at startup to get active format categories
  const { config } = await loadConfig();
  const formatter = getFormatter(config.format);
  const categoryList = formatter.getCategoryList();
  const allAllowed = config.format === "dwsm";
  const categoryDesc = buildCategoryDescription(categoryList, allAllowed);

  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    }
  );

  // Tool: init_changelog
  server.tool(
    "init_changelog",
    "Erstellt eine neue Changelog-Datei und optional eine .changelog-mcp.json Config.",
    {
      format: z
        .enum(["keep-a-changelog", "conventional", "dwsm"])
        .optional()
        .describe("Format-Preset (Default aus Config)"),
      file: z
        .string()
        .optional()
        .refine((f) => !f || isSafeFilename(f), {
          message:
            'Dateiname darf kein "/", "\\", ".." oder Null-Bytes enthalten und nicht leer sein.',
        })
        .describe("Dateiname (Default aus Config)"),
    },
    async ({ format, file }) => handleInitChangelog(format, file)
  );

  // Tool: get_current_version
  server.tool(
    "get_current_version",
    "Liest die aktuelle höchste Versionsnummer aus dem Changelog.",
    {},
    async () => handleGetCurrentVersion()
  );

  // Tool: get_next_version
  server.tool(
    "get_next_version",
    "Berechnet die nächste Versionsnummer basierend auf dem Bump-Typ.",
    {
      bump: z
        .enum(["major", "minor", "patch"])
        .optional()
        .describe('Art des Version-Bumps (Default: "patch")'),
    },
    async ({ bump }) => handleGetNextVersion(bump ?? "patch")
  );

  // Tool: preview_entry
  server.tool(
    "preview_entry",
    "Zeigt eine Vorschau des formatierten Changelog-Eintrags ohne zu schreiben.",
    {
      category: z.string().describe(categoryDesc),
      description: z
        .string()
        .describe("Beschreibung der Änderung"),
      details: z
        .array(z.string())
        .optional()
        .describe("Optionale Detail-Punkte als Array. Kein Markdown (z.B. ###) verwenden - wird als Heading interpretiert."),
      files: z
        .array(z.string())
        .optional()
        .describe("Optionale Liste geänderter Dateien"),
      bump: z
        .enum(["major", "minor", "patch"])
        .optional()
        .describe('Version-Bump-Typ (Default: "patch")'),
    },
    async ({ category, description, details, files, bump }) =>
      handlePreviewEntry(category, description, details, files, bump)
  );

  // Tool: add_entry
  server.tool(
    "add_entry",
    "Fügt einen neuen Eintrag zum Changelog hinzu (Append-Only mit Backup).",
    {
      category: z.string().describe(categoryDesc),
      description: z
        .string()
        .describe("Beschreibung der Änderung"),
      details: z
        .array(z.string())
        .optional()
        .describe("Optionale Detail-Punkte als Array. Kein Markdown (z.B. ###) verwenden - wird als Heading interpretiert."),
      files: z
        .array(z.string())
        .optional()
        .describe("Optionale Liste geänderter Dateien"),
      bump: z
        .enum(["major", "minor", "patch"])
        .optional()
        .describe('Version-Bump-Typ (Default: "patch")'),
    },
    async ({ category, description, details, files, bump }) =>
      handleAddEntry(category, description, details, files, bump)
  );

  // Tool: get_config
  server.tool(
    "get_config",
    "Zeigt die aktuelle Konfiguration des Changelog MCP Servers an.",
    {},
    async () => handleGetConfig()
  );

  // Tool: search_changelog
  server.tool(
    "search_changelog",
    "Durchsucht das Changelog nach Einträgen. Filtert nach Freitext, Version und/oder Kategorie.",
    {
      query: z
        .string()
        .optional()
        .describe("Volltextsuche (case-insensitive)"),
      version: z
        .string()
        .optional()
        .describe("Nach bestimmter Version filtern (exakt oder Präfix)"),
      category: z
        .string()
        .optional()
        .describe(
          "Nach Kategorie filtern (z.B. Added, Fixed, Features)"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Max. Anzahl Ergebnisse (Default: 10)"),
    },
    async ({ query, version, category, limit }) =>
      handleSearchChangelog(query, version, category, limit ?? 10)
  );

  // Tool: get_entry
  server.tool(
    "get_entry",
    "Gibt den vollständigen Changelog-Block einer bestimmten Version zurück.",
    {
      version: z
        .string()
        .describe("Versionsnummer (z.B. 0.1.0, 1.2.3)"),
    },
    async ({ version }) => handleGetEntry(version)
  );

  return server;
}
