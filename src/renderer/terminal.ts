// =============================================================================
// DepGraph CLI — Terminal Report Renderer
// Renders a ScanReport to stdout using chalk + box-drawing characters.
// Max 80 columns wide per PRD §14.
// =============================================================================

import chalk from 'chalk';
import type { ScanReport, PackageScore, RiskLevel } from '../api/types';
import { RISK_COLORS, RISK_LABELS, RISK_ICONS, colorize } from './colors';

const DIVIDER = '─'.repeat(45);
const CLI_VERSION = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return (require('../../package.json') as { version: string }).version;
  } catch {
    return '1.0.0';
  }
})();

// ─── Main render function ─────────────────────────────────────────────────────

/**
 * Render a full ScanReport to process.stdout.
 * Called after the spinner is cleared.
 */
export function renderReport(report: ScanReport, projectName?: string): void {
  const out = (line = '') => process.stdout.write(line + '\n');

  // Header
  out(chalk.bold.white(`DepGraph v${CLI_VERSION}`) +
    chalk.dim(` — Scanned ${report.totalDeps} dependencies`) +
    (projectName ? chalk.dim(` in ${projectName}`) : ''));
  out();

  // Overall health score
  renderHealthScore(report.overallScore, out);
  out();

  // Group packages by risk level
  const grouped = groupByRisk(report.packages);

  // CRITICAL section — full details
  if (grouped.critical.length > 0) {
    renderSection('critical', grouped.critical, out);
    out();
  }

  // HIGH section — full details
  if (grouped.high.length > 0) {
    renderSection('high', grouped.high, out);
    out();
  }

  // MEDIUM section — compact list
  if (grouped.medium.length > 0) {
    renderCompactSection('medium', grouped.medium, out);
    out();
  }

  // Summary bar: HIGH (7)  MEDIUM (18)  LOW (41)  HEALTHY (179)
  renderSummaryBar(report, out);
  out();

  // Share URL
  if (report.shareToken) {
    out(chalk.dim('Full report: ') + chalk.cyan(`https://depgraph.vedanshh.dev/r/${report.shareToken}`));
  }
  out(chalk.dim("Run `npx depgraph fix` to see migration paths."));
}

/**
 * Print error message to stderr with red color.
 */
export function printError(message: string): void {
  process.stderr.write(chalk.red.bold(`✗ Error: ${message}`) + '\n');
}

/**
 * Print a warning to stderr.
 */
export function printWarning(message: string): void {
  process.stderr.write(chalk.yellow(`△ Warning: ${message}`) + '\n');
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderHealthScore(score: number, out: (s?: string) => void): void {
  const bar = renderProgressBar(score);
  const level = scoreToLevel(score);
  const scoreStr = colorize(`${score} / 100`, level);
  out(`  Project Health Score: ${scoreStr}  ${bar}`);
}

function renderSection(
  level: RiskLevel,
  pkgs: PackageScore[],
  out: (s?: string) => void,
): void {
  const color = RISK_COLORS[level];
  const label = RISK_LABELS[level];
  out(color(`  ${label} (${pkgs.length})`));
  out(chalk.dim(`  ${DIVIDER}`));

  for (const pkg of pkgs) {
    renderDepRow(pkg, out);
  }
}

function renderCompactSection(
  level: RiskLevel,
  pkgs: PackageScore[],
  out: (s?: string) => void,
): void {
  const color = RISK_COLORS[level];
  const label = RISK_LABELS[level];
  out(color(`  ${label} (${pkgs.length})`));
  out(chalk.dim(`  ${DIVIDER}`));

  for (const pkg of pkgs) {
    const icon = RISK_ICONS[level];
    const name = pkg.packageName.padEnd(28);
    const scoreStr = chalk.dim(`Score: ${String(pkg.score).padStart(3)}`);
    out(`  ${color(icon)}  ${chalk.white(name)} ${scoreStr}`);
  }
}

function renderDepRow(pkg: PackageScore, out: (s?: string) => void): void {
  const level = pkg.riskLevel;
  const color = RISK_COLORS[level];
  const icon = RISK_ICONS[level];

  // Main row: icon + name + score + metadata
  const name = pkg.packageName.padEnd(22);
  const scoreStr = chalk.dim(`Score: ${String(pkg.score).padStart(3)}`);
  const meta = buildMetaString(pkg);

  out(`  ${color(icon)}  ${chalk.white.bold(name)} ${scoreStr}  ${chalk.dim(meta)}`);

  // Reason sub-line (top factor)
  if (pkg.topFactors.length > 0) {
    const reason = pkg.topFactors[0]!.reason;
    out(`     ${chalk.dim('↳')} ${chalk.italic.dim(truncate(reason, 70))}`);
  }

  // Abandonment risk flag
  if (pkg.abandonmentRisk) {
    out(`     ${chalk.red.bold('⚡ ABANDONMENT RISK')}`);
  }
}

function renderSummaryBar(report: ScanReport, out: (s?: string) => void): void {
  const parts: string[] = [];

  if (report.highCount > 0)
    parts.push(RISK_COLORS.high(`  HIGH (${report.highCount})`));
  if (report.mediumCount > 0)
    parts.push(RISK_COLORS.medium(`MEDIUM (${report.mediumCount})`));
  if (report.lowCount > 0)
    parts.push(RISK_COLORS.low(`LOW (${report.lowCount})`));
  if (report.healthyCount > 0)
    parts.push(RISK_COLORS.healthy(`HEALTHY (${report.healthyCount})`));

  out('  ' + parts.join('   '));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Render a 10-character progress bar using block characters.
 * Example: score=71 → "▓▓▓▓▓▓▓░░░"
 */
export function renderProgressBar(score: number, width = 10): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const level = scoreToLevel(score);
  const bar = '▓'.repeat(filled) + '░'.repeat(empty);
  return RISK_COLORS[level](bar);
}

function buildMetaString(pkg: PackageScore): string {
  const parts: string[] = [];

  const maintenance = pkg.dimensions?.maintenance;
  const busFactor = pkg.dimensions?.busFactor;
  const vuln = pkg.dimensions?.vulnerability;

  if (maintenance && !maintenance.available === false) {
    // Show last commit info if maintenance score is low
    if (maintenance.score < 50) {
      parts.push(maintenance.reason.split('.')[0] ?? '');
    }
  }

  if (busFactor && busFactor.score < 40) {
    parts.push(`${busFactor.reason.split('.')[0] ?? ''}`);
  }

  if (vuln && pkg.dimensions.vulnerability.score < 60) {
    parts.push(`${vuln.reason.split('.')[0] ?? ''}`);
  }

  return parts.filter(Boolean).slice(0, 2).join('  ') || '';
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'low';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'high';
  return 'critical';
}

function groupByRisk(pkgs: PackageScore[]): Record<RiskLevel, PackageScore[]> {
  const groups: Record<RiskLevel, PackageScore[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    healthy: [],
  };
  for (const pkg of pkgs) {
    groups[pkg.riskLevel].push(pkg);
  }
  // Sort each group by score ascending (worst first)
  for (const level of Object.keys(groups) as RiskLevel[]) {
    groups[level].sort((a, b) => a.score - b.score);
  }
  return groups;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
