/**
 * Configuration types and Zod schemas for the changelog MCP server.
 *
 * Defines the complete configuration structure with validation
 * through Zod schemas and TypeScript type inference.
 */

import { z } from "zod";
import { isRelativeSafePath, isSafeFilename } from "../utils/security.js";

export const ChangelogConfigSchema = z.object({
  /** Changelog filename (e.g. "CHANGELOG.md") */
  file: z
    .string()
    .default("CHANGELOG.md")
    .refine(isSafeFilename, {
      message:
        'Dateiname darf kein "/", "\\", ".." oder Null-Bytes enthalten und nicht leer sein.',
    }),
  /** Directory relative to project root */
  path: z
    .string()
    .default("./")
    .refine(isRelativeSafePath, {
      message:
        "Pfad muss relativ sein und darf keine '..' Segmente enthalten.",
    }),
  /** File encoding */
  encoding: z
    .enum(["utf-8", "utf-16le", "latin1", "ascii"])
    .default("utf-8"),
  /** Number of blank lines between changelog entries */
  entrySpacing: z.number().int().min(0).default(2),
});

export const BackupConfigSchema = z.object({
  /** Whether backup system is active */
  enabled: z.boolean().default(true),
  /** Backup directory relative to project root */
  path: z
    .string()
    .default("./changelog-backups")
    .refine(isRelativeSafePath, {
      message:
        "Backup-Pfad muss relativ sein und darf keine '..' Segmente enthalten.",
    }),
  /** Backup strategy */
  strategy: z.enum(["always", "daily", "none"]).default("daily"),
  /** Maximum number of backup files to keep */
  maxFiles: z.number().int().min(1).default(30),
});

export const VersioningConfigSchema = z.object({
  /** Versioning mode */
  mode: z
    .enum(["semver", "patch-only"])
    .default("semver"),
  /** Version prefix (e.g. "v" for v1.2.3) */
  prefix: z.string().default(""),
  /** Fixed major version (for patch-only mode) */
  fixedMajor: z.number().int().nullable().default(null),
  /** Fixed minor version (for patch-only mode) */
  fixedMinor: z.number().int().nullable().default(null),
});

export const ConfigSchema = z.object({
  /** Format preset name */
  format: z
    .enum(["keep-a-changelog", "conventional", "dwsm"])
    .default("keep-a-changelog"),
  /** Changelog file settings */
  changelog: ChangelogConfigSchema.default({}),
  /** Backup settings */
  backup: BackupConfigSchema.default({}),
  /** Versioning settings */
  versioning: VersioningConfigSchema.default({}),
  /** Date format for changelog entries */
  dateFormat: z.string().default("YYYY-MM-DD"),
  /** Language for changelog entries */
  language: z.string().default("en"),
});

/** Full resolved configuration */
export type Config = z.infer<typeof ConfigSchema>;

/** Changelog file configuration */
export type ChangelogConfig = z.infer<typeof ChangelogConfigSchema>;

/** Backup configuration */
export type BackupConfig = z.infer<typeof BackupConfigSchema>;

/** Versioning configuration */
export type VersioningConfig = z.infer<typeof VersioningConfigSchema>;

/** Partial config as found in .changelog-mcp.json */
export type PartialConfig = z.input<typeof ConfigSchema>;
