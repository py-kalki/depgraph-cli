// =============================================================================
// DepGraph CLI — Spinner Wrapper
// Wraps `ora` for consistent start/stop usage across command handlers.
// =============================================================================

import type { Ora } from 'ora';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ora = require('ora') as (options?: { text?: string; isEnabled?: boolean }) => Ora;


/**
 * Start a progress spinner with the given text.
 * Returns the Ora instance for later stopping.
 */
export function startSpinner(text: string): Ora {
  return ora({
    text,
    // Respect NO_COLOR — ora checks this via chalk internally
    isEnabled: process.env['NO_COLOR'] === undefined && process.stderr.isTTY,
  }).start();
}

/**
 * Stop the spinner with a success or failure indicator.
 */
export function stopSpinner(spinner: Ora, success: boolean, text?: string): void {
  if (success) {
    spinner.succeed(text);
  } else {
    spinner.fail(text);
  }
}

/**
 * Stop and clear the spinner without a result indicator.
 * Use before rendering the full report.
 */
export function clearSpinner(spinner: Ora): void {
  spinner.stop();
}
