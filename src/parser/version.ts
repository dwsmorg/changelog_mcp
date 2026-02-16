/**
 * SemVer version extraction and calculation.
 *
 * Handles parsing version numbers from changelog content
 * and computing the next version based on bump type.
 */

import type { VersioningConfig } from "../config/types.js";

/**
 * Regex: matches version headings across all supported formats:
 * - Keep a Changelog: `## [1.2.3]`
 * - Conventional:     `## 1.2.3`
 * - DWSM:            `v1.2.3`
 * - Legacy:          `Version: 1.2.3`
 */
const VERSION_HEADING_PATTERN =
  /^(?:## \[?(\d+\.\d+\.\d+)\]?|v(\d+\.\d+\.\d+)\s*\(|Version:\s*(\d+\.\d+\.\d+))/m;

/**
 * Extracts the first SemVer version from a changelog heading.
 *
 * Only matches version numbers in heading lines (## [X.Y.Z] or Version: X.Y.Z),
 * not from arbitrary content like URLs.
 *
 * @param content - Text content to search for a version
 * @returns Version string (e.g. "1.2.3") or null if not found
 */
export function extractVersion(content: string): string | null {
  const match = content.match(VERSION_HEADING_PATTERN);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

/**
 * Bumps a version number by the given type.
 *
 * In "patch-only" mode with fixedMajor/fixedMinor, only the patch
 * component is incremented; major/minor bumps are ignored.
 *
 * @param current - Current version string (e.g. "1.2.3")
 * @param bump - Type of version bump
 * @param versioning - Optional versioning config for patch-only mode
 * @returns New version string
 * @throws {Error} If the version string is not valid SemVer
 */
export function bumpVersion(
  current: string,
  bump: "major" | "minor" | "patch",
  versioning?: VersioningConfig
): string {
  const parts = current.split(".").map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(
      `FEHLER: Version "${current}" ist kein gültiges SemVer-Format.\n` +
        `Erwartet: X.Y.Z (z.B. "1.2.3")\n` +
        `Lösung: Prüfe das Changelog-Format oder setze die Version manuell.`
    );
  }

  const [major, minor, patch] = parts;

  // In patch-only mode, always increment patch and keep major/minor fixed
  if (versioning?.mode === "patch-only") {
    const fixedMaj = versioning.fixedMajor ?? major;
    const fixedMin = versioning.fixedMinor ?? minor;
    return `${fixedMaj}.${fixedMin}.${patch + 1}`;
  }

  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Computes the initial version for a new changelog based on config.
 *
 * @param versioning - Versioning config with optional fixedMajor/fixedMinor
 * @returns Initial version string
 */
export function getInitialVersion(versioning?: VersioningConfig): string {
  const major = versioning?.fixedMajor ?? 0;
  const minor = versioning?.fixedMinor ?? 1;
  return `${major}.${minor}.0`;
}

/** Default version when no version is found in changelog */
export const FALLBACK_VERSION = "0.0.0";
