// =============================================================================
// DepGraph CLI — `check` Command Handler
// Orchestrates: parse → hash → API call → render → exit code
// =============================================================================

import * as path from 'path';
import type { Command } from 'commander';
import { parseProject, depsToPackageList } from '../parser';
import { readFileSafe } from '../utils/fs';
import { computeSha256 } from '../utils/hash';
import { normalizeError, formatError } from '../utils/error';
import { scanPackages } from '../api/client';
import { loadApiKey } from '../api/auth';
import { renderReport, printError, printWarning } from '../renderer/terminal';
import { renderJson } from '../renderer/json';
import { startSpinner, clearSpinner } from '../renderer/spinner';
import { ThresholdError } from '../types';
import type { CliOptions } from '../types';

/**
 * Execute the `depgraph check` command.
 *
 * Exit codes (PRD F-01):
 *   0 = success (score ≥ threshold or no threshold set)
 *   1 = threshold breached (score < --threshold)
 *   2 = any error (parse, network, API, timeout)
 */
export async function runCheck(opts: CliOptions): Promise<void> {
  const projectDir = path.resolve(opts.path);

  // ── 1. Parse project ────────────────────────────────────────────────────────
  let parseResult;
  try {
    parseResult = parseProject(projectDir, opts.depth);
  } catch (err) {
    const normalized = normalizeError(err);
    printError(formatError(normalized));
    process.exit(normalized.exitCode);
  }

  // Show any parser warnings (e.g. missing lockfile)
  for (const warning of parseResult.warnings) {
    printWarning(warning);
  }

  if (parseResult.deps.length === 0) {
    printError('No dependencies found in package.json.');
    process.exit(2);
  }

  // ── 2. Build package list + lockfile hash ───────────────────────────────────
  const packages = depsToPackageList(parseResult.deps);

  // Hash the raw lockfile content for the API cache key
  const lockfileRaw = readFileSafe(path.join(projectDir, 'package-lock.json'));
  const lockfileHash = lockfileRaw
    ? computeSha256(lockfileRaw)
    : computeSha256(packages.join('\n')); // fallback: hash dep list

  // ── 3. Call the API ─────────────────────────────────────────────────────────
  const apiKey = loadApiKey();
  const spinner = startSpinner(
    `Scanning ${packages.length} dependencies via DepGraph API…`,
  );

  let report;
  try {
    report = await scanPackages(packages, lockfileHash, apiKey);
    clearSpinner(spinner);
  } catch (err) {
    clearSpinner(spinner);
    const normalized = normalizeError(err);
    printError(formatError(normalized));
    process.exit(normalized.exitCode);
  }

  // ── 4. Render output ────────────────────────────────────────────────────────
  if (opts.format === 'json') {
    renderJson(report);
  } else {
    renderReport(report, parseResult.projectName);
  }

  // ── 5. Threshold check ──────────────────────────────────────────────────────
  if (opts.threshold !== undefined && report.overallScore < opts.threshold) {
    const err = new ThresholdError(report.overallScore, opts.threshold);
    if (opts.format !== 'json') {
      printError(err.message);
    }
    process.exit(1);
  }

  process.exit(0);
}

/**
 * Register the `check` command on a Commander program.
 */
export function registerCheckCommand(program: Command): void {
  program
    .command('check')
    .description('Scan a project\'s dependencies and display a health report')
    .option(
      '--path <dir>',
      'Path to the project directory to scan',
      process.cwd(),
    )
    .option(
      '--format <fmt>',
      'Output format: terminal | json',
      'terminal',
    )
    .option(
      '--threshold <n>',
      'Exit code 1 if overall project score is below this value (0–100)',
    )
    .option(
      '--depth <n>',
      'Maximum transitive dependency depth to include (default: all)',
    )
    .option(
      '--no-color',
      'Disable color output (equivalent to NO_COLOR=1)',
    )
    .action(async (rawOpts: Record<string, unknown>) => {
      // Validate and coerce options
      const format = rawOpts['format'];
      if (format !== 'terminal' && format !== 'json') {
        printError(`Invalid --format "${String(format)}". Must be "terminal" or "json".`);
        process.exit(2);
      }

      const threshold = rawOpts['threshold'] !== undefined
        ? parseIntFlag('--threshold', rawOpts['threshold'])
        : undefined;

      const depth = rawOpts['depth'] !== undefined
        ? parseIntFlag('--depth', rawOpts['depth'])
        : undefined;

      // Disable chalk if --no-color or NO_COLOR is set
      if (!rawOpts['color'] || process.env['NO_COLOR'] !== undefined) {
        process.env['FORCE_COLOR'] = '0';
      }

      const opts: CliOptions = {
        path: String(rawOpts['path'] ?? process.cwd()),
        format,
        threshold,
        depth,
        color: Boolean(rawOpts['color'] ?? true),
      };

      await runCheck(opts);
    });
}

// ─── Flag parsing helpers ─────────────────────────────────────────────────────

function parseIntFlag(flagName: string, raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    printError(`${flagName} must be a non-negative integer. Got: "${String(raw)}".`);
    process.exit(2);
  }
  return n;
}
