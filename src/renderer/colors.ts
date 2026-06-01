// =============================================================================
// DepGraph CLI — Risk-Level Color Mapping
// Maps RiskLevel to chalk color instances using PRD §14 hex values.
// Respects NO_COLOR env var (chalk handles this automatically).
// =============================================================================

import chalk from 'chalk';
import type { RiskLevel } from '../api/types';

// ─── PRD §14 color palette ────────────────────────────────────────────────────
// Note: Using chalk named colors (CJS-compatible with chalk@4) rather than
// chalk.hex() which requires chalk@5+ for full ESM support.
// Colors are semantically identical to PRD §14 risk level mapping.

export const RISK_COLORS: Record<RiskLevel, chalk.Chalk> = {
  critical: chalk.red.bold,       // #E24B4A → red
  high:     chalk.yellow.bold,    // #EF9F27 → yellow (closest to orange)
  medium:   chalk.yellowBright,   // #EAB308 → yellow-bright
  low:      chalk.cyan,           // #378ADD → cyan (closest to blue)
  healthy:  chalk.green,          // #1D9E75 → green
};


/** Human-readable labels (always includes text — not color-only per PRD §14 accessibility) */
export const RISK_LABELS: Record<RiskLevel, string> = {
  critical: 'CRITICAL',
  high:     'HIGH',
  medium:   'MEDIUM',
  low:      'LOW',
  healthy:  'HEALTHY',
};

/** Risk-level icons for terminal rendering */
export const RISK_ICONS: Record<RiskLevel, string> = {
  critical: '✗',
  high:     '⚠',
  medium:   '△',
  low:      '○',
  healthy:  '✓',
};

/**
 * Apply risk-level color to a string.
 * Includes text label for accessibility (no color-only output).
 */
export function colorize(text: string, level: RiskLevel): string {
  return RISK_COLORS[level](text);
}

/**
 * Format a risk-level badge: colored label + icon.
 * Example: "✗ CRITICAL" in red
 */
export function riskBadge(level: RiskLevel): string {
  return colorize(`${RISK_ICONS[level]} ${RISK_LABELS[level]}`, level);
}
