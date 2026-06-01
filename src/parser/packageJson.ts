// =============================================================================
// DepGraph CLI — package.json Parser
// Reads and validates package.json, extracts direct dependencies.
// =============================================================================

import type { PackageJson } from './types';
import type { ParsedDep } from '../types';
import { ParseError } from '../types';
import { readFileSafe } from '../utils/fs';
import * as path from 'path';
import * as semver from 'semver';

/**
 * Read and parse the package.json in the given directory.
 * Throws ParseError if the file is missing or malformed.
 */
export function readPackageJson(dir: string): PackageJson {
  const filePath = path.join(dir, 'package.json');
  const raw = readFileSafe(filePath);

  if (raw === null) {
    throw new ParseError('package.json', `File not found at ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ParseError('package.json', `Invalid JSON: ${(err as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ParseError('package.json', 'Root must be a JSON object');
  }

  return parsed as PackageJson;
}

/**
 * Extract all direct dependencies from a parsed package.json.
 *
 * Includes: dependencies + devDependencies.
 * Excludes: peerDependencies, optionalDependencies (not locked in lockfile by default).
 *
 * Version ranges (e.g. "^4.18.2") are normalized to a clean version string.
 * If the range cannot be resolved to a specific version, the raw range is used.
 */
export function extractDirectDeps(pkg: PackageJson): ParsedDep[] {
  const deps: ParsedDep[] = [];

  const addDeps = (record: Record<string, string> | undefined, isDev: boolean) => {
    if (!record) return;
    for (const [name, versionRange] of Object.entries(record)) {
      if (!name || !versionRange) continue;
      deps.push({
        name,
        version: normalizeVersion(versionRange),
        isDev,
        depth: 0,
      });
    }
  };

  addDeps(pkg.dependencies, false);
  addDeps(pkg.devDependencies, true);

  return deps;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize a version range string to a clean semver version.
 * Examples:
 *   "^4.18.2"   → "4.18.2"
 *   "~1.2.3"    → "1.2.3"
 *   ">=2.0.0"   → "2.0.0"  (minVersion)
 *   "latest"    → "latest"
 *   "4.18.2"    → "4.18.2"
 */
function normalizeVersion(range: string): string {
  const trimmed = range.trim();

  // Already a clean semver
  if (semver.valid(trimmed)) return trimmed;

  // Try to extract minimum version from a range
  const min = semver.minVersion(trimmed);
  if (min) return min.version;

  // Fallback: return as-is (e.g. "latest", "next", git URLs)
  return trimmed;
}
