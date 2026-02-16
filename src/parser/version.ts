/**
 * SemVer version extraction and calculation.
 *
 * Handles parsing version numbers from changelog content
 * and computing the next version based on bump type.
 */

/** Regex: matches version headings like "## [1.2.3]" or "## 1.2.3" or "Version: 1.2.3" */
const VERSION_HEADING_PATTERN = /^(?:## \[?|Version:\s*)(\d+\.\d+\.\d+)\]?/m;

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
  return match ? match[1] : null;
}

/**
 * Bumps a version number by the given type.
 *
 * @param current - Current version string (e.g. "1.2.3")
 * @param bump - Type of version bump
 * @returns New version string
 * @throws {Error} If the version string is not valid SemVer
 */
export function bumpVersion(
  current: string,
  bump: "major" | "minor" | "patch"
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

  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

/** Default version when no version is found in changelog */
export const FALLBACK_VERSION = "0.0.0";

/** Initial version for new changelogs */
export const INITIAL_VERSION = "0.1.0";
