/**
 * Default configuration values for zero-config operation.
 *
 * When no .changelog-mcp.json is found, the server uses these
 * defaults, which follow the Keep a Changelog standard.
 */

import type { Config } from "./types.js";

/** Default configuration for zero-config mode */
export const DEFAULT_CONFIG: Config = {
  format: "keep-a-changelog",
  changelog: {
    file: "CHANGELOG.md",
    path: "./",
    encoding: "utf-8",
    entrySpacing: 2,
  },
  backup: {
    enabled: true,
    path: "./changelog-backups",
    strategy: "daily",
    maxFiles: 30,
  },
  versioning: {
    mode: "semver",
    prefix: "",
    fixedMajor: null,
    fixedMinor: null,
  },
  dateFormat: "YYYY-MM-DD",
  language: "en",
};

/** Config filenames to search for (in priority order) */
export const CONFIG_FILENAMES = [
  "changelog-mcp-config.json",
  ".changelog-mcp.json",
];
