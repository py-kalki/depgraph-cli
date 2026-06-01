// =============================================================================
// DepGraph CLI — File System Utilities
// Safe file reading helpers with no-throw semantics.
// =============================================================================

import * as fs from 'fs';

/**
 * Read a file synchronously and return its contents as a string.
 * Returns null if the file does not exist, instead of throwing.
 * Throws for all other errors (permission denied, etc.).
 */
export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Check if a file exists at the given path.
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
