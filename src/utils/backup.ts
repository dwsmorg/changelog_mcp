/**
 * Backup management for changelog files.
 *
 * Supports three strategies:
 * - "always": Create a backup before every write operation
 * - "daily": Create one backup per day (on first write of the day)
 * - "none": No backups
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  fileExists,
  ensureDirectory,
  readFileContent,
  writeFileContent,
} from "./file.js";

/**
 * Creates a backup of the changelog file.
 *
 * @param changelogPath - Absolute path to the changelog file
 * @param backupDir - Absolute path to the backup directory
 * @param strategy - Backup strategy: "always", "daily", or "none"
 * @param maxFiles - Maximum number of backup files to keep
 * @returns true if backup was created, false if skipped
 */
export async function createBackup(
  changelogPath: string,
  backupDir: string,
  strategy: "always" | "daily" | "none",
  maxFiles: number
): Promise<boolean> {
  if (strategy === "none") {
    return false;
  }

  if (!(await fileExists(changelogPath))) {
    return false;
  }

  if (strategy === "daily" && !(await shouldCreateBackup(backupDir))) {
    return false;
  }

  await ensureDirectory(backupDir);

  const ext = path.extname(changelogPath);
  const now = new Date();
  const dateStr = formatDate(now);
  let backupFileName: string;

  if (strategy === "always") {
    const timeStr = formatTime(now);
    backupFileName = `changelog_${dateStr}_${timeStr}${ext}`;
  } else {
    backupFileName = `changelog_${dateStr}${ext}`;
  }

  const backupPath = path.join(backupDir, backupFileName);
  const content = await readFileContent(changelogPath);

  if (content !== null) {
    await writeFileContent(backupPath, content);
  }

  await cleanupOldBackups(backupDir, maxFiles);

  return true;
}

/**
 * Checks if a backup should be created today (for daily strategy).
 *
 * @param backupDir - Absolute path to the backup directory
 * @returns true if no backup exists for today yet
 */
export async function shouldCreateBackup(backupDir: string): Promise<boolean> {
  if (!(await fileExists(backupDir))) {
    return true;
  }

  const todayStr = formatDate(new Date());

  try {
    const files = await fs.readdir(backupDir);
    return !files.some((file) => file.includes(todayStr));
  } catch {
    return true;
  }
}

/**
 * Removes old backup files, keeping only the most recent ones.
 *
 * @param backupDir - Absolute path to the backup directory
 * @param maxFiles - Maximum number of backup files to keep
 */
export async function cleanupOldBackups(
  backupDir: string,
  maxFiles: number
): Promise<void> {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter((f) => f.startsWith("changelog_"))
      .sort();

    if (backupFiles.length <= maxFiles) {
      return;
    }

    const filesToDelete = backupFiles.slice(
      0,
      backupFiles.length - maxFiles
    );

    for (const file of filesToDelete) {
      await fs.unlink(path.join(backupDir, file));
    }
  } catch {
    // Cleanup failure is non-critical
  }
}

/**
 * Formats a date as YYYYMMDD string.
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Formats a time as HHMMSS string.
 */
function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}${m}${s}`;
}
