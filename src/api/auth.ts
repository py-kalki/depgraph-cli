// =============================================================================
// DepGraph CLI — API Authentication
// Reads the user's API key from ~/.depgraph/config.json
// =============================================================================

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { DepGraphConfig } from '../types';

/** Path to the CLI config file */
export const CONFIG_PATH = path.join(os.homedir(), '.depgraph', 'config.json');

/**
 * Load the API key from the config file.
 * Returns null if the file is missing or malformed (anonymous scan allowed).
 */
export function loadApiKey(): string | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw) as Partial<DepGraphConfig>;
    return typeof config.apiKey === 'string' && config.apiKey.length > 0
      ? config.apiKey
      : null;
  } catch {
    return null;
  }
}

/**
 * Save an API key to the config file.
 * Creates the ~/.depgraph directory if it doesn't exist.
 */
export function saveApiKey(apiKey: string): void {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const config: DepGraphConfig = { apiKey };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
