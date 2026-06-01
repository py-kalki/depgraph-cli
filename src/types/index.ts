// =============================================================================
// DepGraph CLI — Shared Type Definitions
// All CLI-local types and typed error class hierarchy.
// =============================================================================

import type { RiskLevel } from '../api/types';

// ─── CLI Options ──────────────────────────────────────────────────────────────

export interface CliOptions {
  /** Absolute path to the project directory to scan */
  path: string;
  /** Output format */
  format: 'terminal' | 'json';
  /** Exit 1 if overallScore < threshold (undefined = disabled) */
  threshold?: number;
  /** Max transitive dependency depth (undefined = all) */
  depth?: number;
  /** Whether to render colors (respects NO_COLOR env var) */
  color: boolean;
}

// ─── Config file ──────────────────────────────────────────────────────────────

/** Shape of ~/.depgraph/config.json */
export interface DepGraphConfig {
  apiKey: string;
}

// ─── Parser types ─────────────────────────────────────────────────────────────

export interface ParsedDep {
  /** npm package name */
  name: string;
  /** Resolved version string (e.g. "4.18.2") */
  version: string;
  /** Whether it is a devDependency */
  isDev: boolean;
  /** Depth in the dependency tree (0 = direct) */
  depth: number;
}

// ─── Error class hierarchy ────────────────────────────────────────────────────

/**
 * Base error class for all DepGraph CLI errors.
 * Carries an exitCode so the top-level handler knows which code to use.
 *
 * Exit code semantics (PRD F-01):
 *   0 = success
 *   1 = threshold breached
 *   2 = error (parse, network, API, auth, timeout)
 */
export class DepGraphError extends Error {
  readonly exitCode: 0 | 1 | 2;

  constructor(message: string, exitCode: 0 | 1 | 2 = 2) {
    super(message);
    this.name = 'DepGraphError';
    this.exitCode = exitCode;
    // Maintains proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when API key is missing or rejected (HTTP 401) */
export class AuthError extends DepGraphError {
  constructor(message = 'Invalid or missing API key. Run `npx depgraph auth` to authenticate.') {
    super(message, 2);
    this.name = 'AuthError';
  }
}

/** Thrown when the API request times out (>30s) */
export class TimeoutError extends DepGraphError {
  constructor(message = 'Request timed out after 30 seconds. Check your connection and retry.') {
    super(message, 2);
    this.name = 'TimeoutError';
  }
}

/** Thrown when the API returns an HTTP error response */
export class ApiError extends DepGraphError {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(`API error ${statusCode}: ${message}`, 2);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/** Thrown when the network is unreachable */
export class NetworkError extends DepGraphError {
  constructor(cause: Error) {
    super(`Network error: ${cause.message}. Check your internet connection.`, 2);
    this.name = 'NetworkError';
  }
}

/** Thrown when package.json or package-lock.json cannot be read or parsed */
export class ParseError extends DepGraphError {
  constructor(file: string, reason: string) {
    super(`Failed to parse ${file}: ${reason}`, 2);
    this.name = 'ParseError';
  }
}

/** Thrown when --threshold is set and the project score falls below it */
export class ThresholdError extends DepGraphError {
  readonly score: number;
  readonly threshold: number;

  constructor(score: number, threshold: number) {
    super(
      `Project health score ${score} is below threshold ${threshold}. Failing build.`,
      1,
    );
    this.name = 'ThresholdError';
    this.score = score;
    this.threshold = threshold;
  }
}

// ─── Re-exports for convenience ───────────────────────────────────────────────
export type { RiskLevel };
