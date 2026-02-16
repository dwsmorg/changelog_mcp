/**
 * Config tool handler for the MCP server.
 *
 * Provides the get_config tool that displays the
 * currently active configuration.
 */

import { loadConfig } from "../config/loader.js";
import type { ToolResponse } from "./types.js";

/**
 * Handles the get_config tool call.
 *
 * @returns MCP response with the active configuration as JSON
 */
export async function handleGetConfig(): Promise<ToolResponse> {
  try {
    const { config, configPath, isDefault } = await loadConfig();

    const header = isDefault
      ? "Keine .changelog-mcp.json gefunden, verwende Defaults.\n" +
        "Hinweis: Erstelle eine .changelog-mcp.json im Projekt-Root für individuelle Einstellungen.\n\n"
      : `Config geladen von: ${configPath}\n\n`;

    return {
      content: [
        {
          type: "text",
          text: header + JSON.stringify(config, null, 2),
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
