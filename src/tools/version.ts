/**
 * Version tool handlers for the MCP server.
 *
 * Provides get_current_version and get_next_version tools
 * for reading and calculating changelog versions.
 */

import { loadConfig } from "../config/loader.js";
import { getCurrentVersion } from "../parser/changelog.js";
import {
  bumpVersion,
  FALLBACK_VERSION,
  INITIAL_VERSION,
} from "../parser/version.js";
import type { ToolResponse } from "./types.js";

/**
 * Handles the get_current_version tool call.
 *
 * @returns MCP response with the current version
 */
export async function handleGetCurrentVersion(): Promise<ToolResponse> {
  try {
    const { config } = await loadConfig();
    const version = await getCurrentVersion(config);

    if (version === FALLBACK_VERSION) {
      return {
        content: [
          {
            type: "text",
            text:
              `Aktuelle Version: ${version}\n` +
              `Hinweis: Keine Version im Changelog gefunden. ` +
              `Nächste Version wird ${INITIAL_VERSION} sein.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Aktuelle Version: ${version}`,
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
 * Handles the get_next_version tool call.
 *
 * @param bump - Version bump type, defaults to "patch"
 * @returns MCP response with the calculated next version
 */
export async function handleGetNextVersion(
  bump: "major" | "minor" | "patch" = "patch"
): Promise<ToolResponse> {
  try {
    const { config } = await loadConfig();
    const currentVersion = await getCurrentVersion(config);

    let nextVersion: string;
    if (currentVersion === FALLBACK_VERSION) {
      // No version found, start at initial version
      nextVersion = INITIAL_VERSION;
    } else {
      nextVersion = bumpVersion(currentVersion, bump);
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Aktuelle Version: ${currentVersion}\n` +
            `Bump: ${bump}\n` +
            `Nächste Version: ${nextVersion}`,
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
