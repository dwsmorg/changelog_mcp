/**
 * Configuration loader for the changelog MCP server.
 *
 * Searches for config in the following order:
 * 0. CHANGELOG_MCP_CONFIG environment variable (explicit path)
 * 1. Current working directory (changelog-mcp-config.json, .changelog-mcp.json)
 * 2. Git root directory
 * 3. Falls back to zero-config defaults
 */

import path from "node:path";
import { execSync } from "node:child_process";
import { readFileContent, fileExists } from "../utils/file.js";
import { ConfigSchema, type Config, type PartialConfig } from "./types.js";
import { CONFIG_FILENAMES, DEFAULT_CONFIG } from "./defaults.js";

/** Result of loading the configuration */
export interface ConfigResult {
  /** The resolved configuration */
  config: Config;
  /** Path to the config file, or null if using defaults */
  configPath: string | null;
  /** Whether zero-config defaults are being used */
  isDefault: boolean;
}

/**
 * Loads the configuration from disk or returns defaults.
 *
 * @returns Resolved configuration with metadata
 * @throws {Error} If the config file exists but contains invalid JSON or fails validation
 */
export async function loadConfig(): Promise<ConfigResult> {
  const cwd = process.cwd();

  // 0. Check CHANGELOG_MCP_CONFIG env variable
  const envConfigPath = process.env.CHANGELOG_MCP_CONFIG;
  if (envConfigPath) {
    const resolvedEnvPath = path.resolve(cwd, envConfigPath);
    if (await fileExists(resolvedEnvPath)) {
      return await parseConfigFile(resolvedEnvPath);
    }
  }

  // 1. Check cwd
  const cwdResult = await findConfigInDir(cwd);
  if (cwdResult) return cwdResult;

  // 2. Check git root
  const gitRoot = getGitRoot();
  if (gitRoot && gitRoot !== cwd) {
    const gitResult = await findConfigInDir(gitRoot);
    if (gitResult) return gitResult;
  }

  // 3. Zero-config defaults
  return {
    config: DEFAULT_CONFIG,
    configPath: null,
    isDefault: true,
  };
}

/**
 * Searches for a config file in the given directory.
 *
 * @param dir - Directory to search in
 * @returns ConfigResult if found, null otherwise
 */
async function findConfigInDir(dir: string): Promise<ConfigResult | null> {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.resolve(dir, filename);
    if (await fileExists(configPath)) {
      return await parseConfigFile(configPath);
    }
  }
  return null;
}

/**
 * Parses and validates a config file.
 *
 * @param configPath - Absolute path to the config file
 * @returns Parsed and validated configuration
 * @throws {Error} If the file contains invalid JSON or fails Zod validation
 */
async function parseConfigFile(configPath: string): Promise<ConfigResult> {
  const content = await readFileContent(configPath);

  if (content === null) {
    return {
      config: DEFAULT_CONFIG,
      configPath: null,
      isDefault: true,
    };
  }

  const filename = path.basename(configPath);

  let rawConfig: PartialConfig;
  try {
    rawConfig = JSON.parse(content) as PartialConfig;
  } catch {
    throw new Error(
      `FEHLER: Ungültiges JSON in Config-Datei.\n` +
        `Pfad: ${configPath}\n` +
        `Lösung: Prüfe die JSON-Syntax in ${filename}.`
    );
  }

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    throw new Error(
      `FEHLER: Ungültige Konfiguration in ${filename}.\n` +
        `Pfad: ${configPath}\n` +
        `Probleme:\n${issues}\n` +
        `Lösung: Korrigiere die oben genannten Felder.`
    );
  }

  return {
    config: result.data,
    configPath,
    isDefault: false,
  };
}

/**
 * Gets the git root directory, if in a git repository.
 *
 * @returns Git root path, or null if not in a git repo
 */
function getGitRoot(): string | null {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return root || null;
  } catch {
    return null;
  }
}
