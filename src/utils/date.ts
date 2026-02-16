/**
 * Date formatting utilities for changelog entries.
 *
 * Supports configurable date format strings with the following tokens:
 * - YYYY: 4-digit year
 * - MM: 2-digit month (zero-padded)
 * - DD: 2-digit day (zero-padded)
 */

/**
 * Formats the current date using the given format string.
 *
 * @param format - Date format string (e.g. "YYYY-MM-DD", "DD.MM.YYYY")
 * @returns Formatted date string
 */
export function formatDate(format: string): string {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return format
    .replace("YYYY", y)
    .replace("MM", m)
    .replace("DD", d);
}
