/**
 * Central security utilities for path validation, symlink protection,
 * and file size enforcement.
 *
 * Guards against path traversal, symlink following, and unbounded file growth.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

/** Maximum allowed changelog file size: 10 MB */
export const MAX_CHANGELOG_SIZE = 10 * 1024 * 1024;

/**
 * Checks whether a path segment is a safe relative path (no traversal, not absolute).
 *
 * @param p - Path string to validate
 * @returns true if the path is safe
 */
export function isRelativeSafePath(p: string): boolean {
  if (path.isAbsolute(p)) {
    return false;
  }

  const segments = p.split(/[/\\]/);
  return !segments.includes("..");
}

/**
 * Checks whether a filename is safe (no directory separators, no traversal, no null bytes).
 *
 * @param f - Filename to validate
 * @returns true if the filename is safe
 */
export function isSafeFilename(f: string): boolean {
  if (f.length === 0) {
    return false;
  }

  if (f.includes("/") || f.includes("\\") || f.includes("..") || f.includes("\0")) {
    return false;
  }

  return true;
}

/**
 * Validates that a resolved path stays within the given root directory.
 *
 * @param resolvedPath - Absolute path to check
 * @param rootDir - Allowed root directory (defaults to cwd)
 * @throws {Error} If the path escapes the root directory
 */
export function validatePathWithinRoot(
  resolvedPath: string,
  rootDir?: string
): void {
  const root = path.resolve(rootDir ?? process.cwd());
  const normalized = path.resolve(resolvedPath);

  if (normalized !== root && !normalized.startsWith(root + path.sep)) {
    throw new Error(
      `Sicherheitsfehler: Pfad verlässt das Projektverzeichnis.\n` +
      `Pfad: ${normalized}\n` +
      `Erlaubtes Verzeichnis: ${root}\n` +
      `Lösung: Verwende einen relativen Pfad ohne ".." der innerhalb des Projekts bleibt.`
    );
  }
}

/**
 * Validates that a filename contains no directory separators or traversal sequences.
 *
 * @param filename - Filename to validate
 * @throws {Error} If the filename is unsafe
 */
export function validateFilename(filename: string): void {
  if (!isSafeFilename(filename)) {
    throw new Error(
      `Sicherheitsfehler: Ungültiger Dateiname "${filename}".\n` +
      `Dateinamen dürfen kein "/", "\\", ".." oder Null-Bytes enthalten und nicht leer sein.\n` +
      `Lösung: Verwende einen einfachen Dateinamen wie "CHANGELOG.md".`
    );
  }
}

/**
 * Asserts that the given path is not a symbolic link.
 *
 * @param filePath - Absolute path to check
 * @throws {Error} If the path is a symlink
 */
export async function assertNotSymlink(filePath: string): Promise<void> {
  try {
    const stat = await fs.lstat(filePath);

    if (stat.isSymbolicLink()) {
      throw new Error(
        `Sicherheitsfehler: Symlink erkannt.\n` +
        `Pfad: ${filePath}\n` +
        `Changelog-Operationen auf Symlinks sind nicht erlaubt.\n` +
        `Lösung: Ersetze den Symlink durch eine reguläre Datei.`
      );
    }
  } catch (error) {
    // File doesn't exist → no symlink → ok
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

/**
 * Asserts that the file does not exceed the given size limit.
 *
 * @param filePath - Absolute path to check
 * @param maxBytes - Maximum allowed size in bytes (defaults to MAX_CHANGELOG_SIZE)
 * @throws {Error} If the file exceeds the limit
 */
export async function assertFileSizeWithinLimit(
  filePath: string,
  maxBytes: number = MAX_CHANGELOG_SIZE
): Promise<void> {
  try {
    const stat = await fs.lstat(filePath);

    if (stat.size > maxBytes) {
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
      const limitMB = (maxBytes / (1024 * 1024)).toFixed(2);
      throw new Error(
        `Sicherheitsfehler: Changelog-Datei überschreitet das Größenlimit.\n` +
        `Dateigröße: ${sizeMB} MB\n` +
        `Limit: ${limitMB} MB\n` +
        `Pfad: ${filePath}\n` +
        `Das Changelog wird automatisch aufgeteilt (Auto-Split).`
      );
    }
  } catch (error) {
    // File doesn't exist → no size issue
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}
