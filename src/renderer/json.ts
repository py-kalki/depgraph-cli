// =============================================================================
// DepGraph CLI — JSON Output Renderer
// Formats a ScanReport as indented JSON to stdout for --format json mode.
// =============================================================================

import type { ScanReport } from '../api/types';

/**
 * Render a ScanReport as JSON to stdout.
 * Used when --format json is passed. Suitable for CI/CD pipeline consumption.
 */
export function renderJson(report: ScanReport): void {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
