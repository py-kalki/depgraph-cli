// =============================================================================
// DepGraph CLI — API Client
// HTTP client for the DepGraph scoring API.
// Implements 30-second timeout and typed error mapping.
// =============================================================================

import type { ScanReport, ScanRequest } from './types';
import { AuthError, TimeoutError, ApiError, NetworkError } from '../types';

/** API base URL — override via DEPGRAPH_API_URL env var for local dev */
const API_BASE_URL =
  process.env['DEPGRAPH_API_URL'] ?? 'https://depgraph.vedanshh.dev';

/** Request timeout in milliseconds (Increased to 90s for huge monorepos) */
const TIMEOUT_MS = 90_000;

// ─── Main scanning function ───────────────────────────────────────────────────

/**
 * Send a list of packages to POST /api/scan and return the scored ScanReport.
 *
 * @param packages     Array of "name@version" strings
 * @param lockfileHash SHA-256 hash of the raw package-lock.json content
 * @param apiKey       Optional API key for authenticated requests
 */
export async function scanPackages(
  packages: string[],
  lockfileHash: string,
  apiKey?: string | null,
): Promise<ScanReport> {
  const url = `${API_BASE_URL}/api/scan`;
  const body: ScanRequest = { packages, lockfileHash };

  return fetchWithTimeout<ScanReport>(url, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

/**
 * Fetch a scan report by share token from GET /api/report/:shareToken.
 * No authentication required.
 */
export async function getReport(shareToken: string): Promise<ScanReport> {
  const url = `${API_BASE_URL}/api/report/${encodeURIComponent(shareToken)}`;
  return fetchWithTimeout<ScanReport>(url, { method: 'GET' });
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError(err as Error);
  } finally {
    clearTimeout(timer);
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Ignore JSON parse failure — use statusText
    }
    throw new ApiError(response.status, message);
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    throw new ApiError(200, `Failed to parse API response: ${(err as Error).message}`);
  }
}

function buildHeaders(apiKey?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': `depgraph-cli/${getCliVersion()}`,
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return headers;
}

function getCliVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json') as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}
