// =============================================================================
// DepGraph CLI — package-lock.json Parser
// Supports lockfile v1 (npm 6) and v2/v3 (npm 7+).
// Performs BFS traversal with optional depth limiting and deduplication.
// =============================================================================

import type { LockfileData, LockfileV1, LockfileV2, LockfileDepV1 } from './types';
import type { ParsedDep } from '../types';
import { ParseError } from '../types';
import { readFileSafe } from '../utils/fs';
import * as path from 'path';

/**
 * Read and parse the package-lock.json in the given directory.
 * Returns null (with a warning) if the file doesn't exist.
 * Throws ParseError if the file exists but is malformed.
 */
export function readLockfile(dir: string): LockfileData | null {
  const filePath = path.join(dir, 'package-lock.json');
  const raw = readFileSafe(filePath);

  if (raw === null) {
    // Not having a lockfile is valid; caller logs a warning
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ParseError('package-lock.json', `Invalid JSON: ${(err as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ParseError('package-lock.json', 'Root must be a JSON object');
  }

  const obj = parsed as Record<string, unknown>;
  const version = obj['lockfileVersion'];

  if (version !== 1 && version !== 2 && version !== 3) {
    throw new ParseError(
      'package-lock.json',
      `Unsupported lockfileVersion: ${String(version)}. Expected 1, 2, or 3.`,
    );
  }

  return parsed as LockfileData;
}

/**
 * Extract all dependencies from a parsed lockfile with optional depth limiting.
 *
 * - v1 lockfiles: traverse nested `dependencies` tree via BFS
 * - v2/v3 lockfiles: parse the flat `packages` map; derive depth from path nesting
 *
 * Deduplication: if a package appears at multiple versions, the highest semver wins.
 *
 * @param lockfile  Parsed lockfile data
 * @param maxDepth  Max depth to include (0 = direct only, undefined = all)
 * @returns         Flat, deduplicated list of ParsedDep
 */
export function extractAllDeps(
  lockfile: LockfileData,
  maxDepth?: number,
): ParsedDep[] {
  const depMap = new Map<string, ParsedDep>();

  if (lockfile.lockfileVersion === 1) {
    extractV1(lockfile as LockfileV1, depMap, maxDepth);
  } else {
    extractV2(lockfile as LockfileV2, depMap, maxDepth);
  }

  return Array.from(depMap.values());
}

// ─── v1 extraction ────────────────────────────────────────────────────────────

function extractV1(
  lockfile: LockfileV1,
  depMap: Map<string, ParsedDep>,
  maxDepth?: number,
): void {
  if (!lockfile.dependencies) return;

  // BFS queue: [depRecord, currentDepth]
  const queue: Array<[Record<string, LockfileDepV1>, number]> = [
    [lockfile.dependencies, 1],
  ];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    const [deps, depth] = item;

    for (const [name, entry] of Object.entries(deps)) {
      if (!entry.version) continue;

      upsertDep(depMap, {
        name,
        version: entry.version,
        isDev: entry.dev ?? false,
        depth,
      });

      // Recurse into nested dependencies if within depth limit
      if (entry.dependencies && (maxDepth === undefined || depth < maxDepth)) {
        queue.push([entry.dependencies, depth + 1]);
      }
    }
  }
}

// ─── v2/v3 extraction ─────────────────────────────────────────────────────────

/**
 * In v2/v3, keys look like:
 *   ""                                     → root package (skip)
 *   "node_modules/express"                 → depth 1
 *   "node_modules/express/node_modules/qs" → depth 2
 */
function extractV2(
  lockfile: LockfileV2,
  depMap: Map<string, ParsedDep>,
  maxDepth?: number,
): void {
  for (const [key, entry] of Object.entries(lockfile.packages)) {
    // Skip root package
    if (key === '') continue;
    if (!entry.version) continue;

    const { name, depth } = parseV2Key(key);
    if (!name) continue;
    if (maxDepth !== undefined && depth > maxDepth) continue;

    upsertDep(depMap, {
      name,
      version: entry.version,
      isDev: entry.dev ?? false,
      depth,
    });
  }
}

/**
 * Parse a v2 package key to extract package name and depth.
 * "node_modules/a/node_modules/b" → { name: "b", depth: 2 }
 * "node_modules/@scope/pkg"        → { name: "@scope/pkg", depth: 1 }
 */
function parseV2Key(key: string): { name: string | null; depth: number } {
  const parts = key.split('node_modules/');
  // parts[0] is empty, each subsequent part is a package segment
  const depth = parts.length - 1;
  const lastPart = parts[parts.length - 1];

  if (!lastPart) return { name: null, depth: 0 };

  // Strip trailing slash if present
  const name = lastPart.endsWith('/') ? lastPart.slice(0, -1) : lastPart;

  return { name: name || null, depth };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Insert or update a dep in the map.
 * If a dep with the same name already exists, keep the higher version.
 */
function upsertDep(map: Map<string, ParsedDep>, dep: ParsedDep): void {
  const existing = map.get(dep.name);
  if (!existing) {
    map.set(dep.name, dep);
    return;
  }

  // Keep higher version (basic string comparison; good enough for semver)
  try {
    const { gt } = require('semver') as { gt: (a: string, b: string) => boolean };
    if (gt(dep.version, existing.version)) {
      map.set(dep.name, dep);
    }
  } catch {
    // semver parse failure — keep existing
  }
}
