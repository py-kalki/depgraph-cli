// =============================================================================
// DepGraph CLI — Error Utilities
// Helpers for normalising unknown errors and pretty-printing them.
// =============================================================================

import { DepGraphError } from '../types';

/**
 * Normalise any caught value to a DepGraphError.
 * If it's already a DepGraphError, return as-is.
 * If it's a standard Error, wrap it.
 * Otherwise, wrap the stringified value.
 */
export function normalizeError(err: unknown): DepGraphError {
  if (err instanceof DepGraphError) return err;
  if (err instanceof Error) {
    const wrapped = new DepGraphError(err.message, 2);
    wrapped.stack = err.stack;
    return wrapped;
  }
  return new DepGraphError(String(err), 2);
}

/**
 * Format an error for stderr output.
 * Includes the error name prefix for non-generic errors.
 */
export function formatError(err: DepGraphError): string {
  const prefix = err.name !== 'DepGraphError' ? `[${err.name}] ` : '';
  return `${prefix}${err.message}`;
}
