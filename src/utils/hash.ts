// =============================================================================
// DepGraph CLI — SHA-256 Hash Utility
// Computes a lockfileHash for use as the Redis cache key in the scan API.
// =============================================================================

import * as crypto from 'crypto';

/**
 * Compute a SHA-256 hex digest of the given string content.
 * Used to hash raw package-lock.json content for the API lockfileHash param.
 *
 * Example:
 *   computeSha256('{"lockfileVersion":2}') → "3a9d2b..."
 */
export function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}
