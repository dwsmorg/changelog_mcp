/**
 * Platform-independent file operations for changelog management.
 *
 * All paths are resolved via Node.js path module to ensure
 * cross-platform compatibility (Windows, Linux, macOS, WSL).
 */

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Resolves a relative file path against a base path.
 *
 * @param basePath - The base directory (typically cwd)
 * @param relativePath - The relative path to resolve
 * @returns Absolute file path
 */
export function resolveFilePath(basePath: string, relativePath: string): string {
  return path.resolve(basePath, relativePath);
}

/**
 * Reads the content of a file.
 *
 * @param filePath - Absolute path to the file
 * @param encoding - File encoding, defaults to utf-8
 * @returns File content as string, or null if file doesn't exist
 */
export async function readFileContent(
  filePath: string,
  encoding: BufferEncoding = "utf-8"
): Promise<string | null> {
  try {
    return await fs.readFile(filePath, { encoding });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Writes content to a file, creating parent directories if needed.
 *
 * @param filePath - Absolute path to the file
 * @param content - Content to write
 * @param encoding - File encoding, defaults to utf-8
 */
export async function writeFileContent(
  filePath: string,
  content: string,
  encoding: BufferEncoding = "utf-8"
): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, content, { encoding });
}

/**
 * Checks if a file exists at the given path.
 *
 * @param filePath - Absolute path to check
 * @returns true if the file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the file size in bytes.
 *
 * @param filePath - Absolute path to the file
 * @returns File size in bytes, or 0 if file doesn't exist
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 *
 * @param dirPath - Absolute path to the directory
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
