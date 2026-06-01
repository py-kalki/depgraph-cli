// =============================================================================
// DepGraph CLI — Parser Types
// Shapes for package.json and package-lock.json (v1 and v2) parsing.
// =============================================================================

// ─── package.json ─────────────────────────────────────────────────────────────

/** Minimal shape of a project's package.json */
export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

// ─── package-lock.json (v1 — npm 6) ──────────────────────────────────────────

/** Nested dep entry in lockfile v1 */
export interface LockfileDepV1 {
  version: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  optional?: boolean;
  dependencies?: Record<string, LockfileDepV1>;
}

/** package-lock.json v1 root shape */
export interface LockfileV1 {
  lockfileVersion: 1;
  name?: string;
  version?: string;
  dependencies?: Record<string, LockfileDepV1>;
}

// ─── package-lock.json (v2/v3 — npm 7+) ──────────────────────────────────────

/** Flat package entry in lockfile v2/v3 */
export interface LockfilePackageV2 {
  version: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  optional?: boolean;
  peer?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/** package-lock.json v2 or v3 root shape */
export interface LockfileV2 {
  lockfileVersion: 2 | 3;
  name?: string;
  version?: string;
  /**
   * Flat map of "node_modules/pkg" or "node_modules/a/node_modules/b" → metadata.
   * Key "" (empty string) = the root package itself.
   */
  packages: Record<string, LockfilePackageV2>;
}

/** Discriminated union of all supported lockfile formats */
export type LockfileData = LockfileV1 | LockfileV2;
