// =============================================================================
// DepGraph CLI — Entry Point
// Sets up the Commander program with all commands and global options.
// =============================================================================

import { Command } from 'commander';
import { registerCheckCommand } from './commands/check';
import { printError } from './renderer/terminal';
import { normalizeError, formatError } from './utils/error';

// ─── Read version from package.json ──────────────────────────────────────────

let CLI_VERSION = '1.0.0';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CLI_VERSION = (require('../package.json') as { version: string }).version;
} catch {
  // Use default
}

// ─── Commander program ────────────────────────────────────────────────────────

const program = new Command();

program
  .name('depgraph')
  .description(
    'Dependency health scores and abandonment risk forecasting for npm projects.\n' +
    'Run `npx depgraph check` in any Node.js project.',
  )
  .version(CLI_VERSION, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command');

// Register all commands
registerCheckCommand(program);

// ─── Global error handler ─────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  const normalized = normalizeError(err);
  printError(formatError(normalized));
  process.exit(normalized.exitCode);
});

process.on('unhandledRejection', (reason) => {
  const normalized = normalizeError(reason);
  printError(formatError(normalized));
  process.exit(normalized.exitCode);
});

// ─── Parse arguments ──────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err: unknown) => {
  const normalized = normalizeError(err);
  printError(formatError(normalized));
  process.exit(normalized.exitCode);
});
