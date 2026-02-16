/**
 * Base formatter interface for all changelog formats.
 *
 * Each format preset implements this interface to provide
 * consistent formatting across different changelog styles.
 */

/** Parameters for formatting a single changelog entry */
export interface FormatEntryParams {
  version: string;
  date: string;
  category: string;
  description: string;
  details?: string[];
  files?: string[];
}

/** Common interface all changelog formatters must implement */
export interface ChangelogFormatter {
  /** Unique format name matching the config preset key */
  readonly name: string;

  /** List of valid category names for this format */
  readonly categories: readonly string[];

  /** Default changelog filename for this format */
  readonly defaultFile: string;

  /**
   * Checks if a category is valid for this format.
   *
   * @param category - Category name to check
   * @returns true if valid
   */
  isValidCategory(category: string): boolean;

  /**
   * Returns comma-separated list of valid categories.
   */
  getCategoryList(): string;

  /**
   * Formats a single changelog entry.
   *
   * @param params - Entry parameters
   * @returns Formatted string ready to insert into changelog
   */
  formatEntry(params: FormatEntryParams): string;

  /**
   * Generates the initial changelog file template (header etc.).
   *
   * @returns Complete initial changelog content
   */
  formatInitialChangelog(): string;
}
