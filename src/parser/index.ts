// =============================================================================
// DepGraph CLI — Parser Orchestrator
// Reads package.json + package-lock.json and produces a unified dep list.
// =============================================================================

import { readPackageJson, extractDirectDeps } from './packageJson';
import { readLockfile, extractAllDeps } from './lockfile';
import type { ParsedDep } from '../types';
import * as path from 'path';

export interface ParseResult {
  /** Resolved absolute path to the project directory */
  projectDir: string;
  /** Project name from package.json (if available) */
  projectName: string;
  /** All dependencies (direct + transitive, filtered by depth) */
  deps: ParsedDep[];
  /** Whether the lockfile was found (false = only direct deps available) */
  hasLockfile: boolean;
  /** Warning messages (e.g. missing lockfile) */
  warnings: string[];
}

/**
 * Parse a project directory and extract its full dependency list.
 *
 * @param dir       Absolute path to the project directory
 * @param maxDepth  Max transitive depth (undefined = all; 0 = direct only)
 */
export function parseProject(dir: string, maxDepth?: number): ParseResult {
  const projectDir = path.resolve(dir);
  const warnings: string[] = [];

  // 1. Read package.json (required)
  const pkgJson = readPackageJson(projectDir);
  const directDeps = extractDirectDeps(pkgJson);

  // 2. Read package-lock.json (optional)
  const lockfile = readLockfile(projectDir);

  if (lockfile === null) {
    warnings.push(
      'No package-lock.json found. Only direct dependencies will be scanned. ' +
        'Run `npm install` to generate a lockfile for full transitive analysis.',
    );
    return {
      projectDir,
      projectName: pkgJson.name ?? path.basename(projectDir),
      deps: directDeps,
      hasLockfile: false,
      warnings,
    };
  }

  // 3. Extract all deps from lockfile (preferred — includes transitive)
  const allDeps = extractAllDeps(lockfile, maxDepth);

  // 4. Merge: lockfile deps take precedence, fall back to direct deps for missing
  const mergedMap = new Map<string, ParsedDep>();

  for (const dep of allDeps) {
    mergedMap.set(dep.name, dep);
  }

  // Add any direct deps not in lockfile (edge case: optional/peer deps)
  for (const dep of directDeps) {
    if (!mergedMap.has(dep.name)) {
      mergedMap.set(dep.name, dep);
    }
  }

  return {
    projectDir,
    projectName: pkgJson.name ?? path.basename(projectDir),
    deps: Array.from(mergedMap.values()),
    hasLockfile: true,
    warnings,
  };
}

/**
 * Convert a dep list to "name@version" strings for the API.
 */
export function depsToPackageList(deps: ParsedDep[]): string[] {
  return deps.map((d) => `${d.name}@${d.version}`);
}
