// =============================================================================
// Tests: api/client
// =============================================================================

import { scanPackages, getReport } from '../../src/api/client';
import { AuthError, TimeoutError, ApiError, NetworkError } from '../../src/types';
import type { ScanReport } from '../../src/api/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

const MOCK_REPORT: ScanReport = {
  id: 'report-1',
  shareToken: 'abc123',
  overallScore: 74,
  totalDeps: 3,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 1,
  lowCount: 1,
  healthyCount: 0,
  packages: [],
  createdAt: new Date().toISOString(),
  projectId: null,
};

function makeResponse(
  status: number,
  body: unknown,
  ok = status >= 200 && status < 300,
): Response {
  return {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    ok,
    json: async () => body,
    headers: new Headers(),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── scanPackages ─────────────────────────────────────────────────────────────

describe('scanPackages', () => {
  test('calls POST /api/scan with correct URL, headers, and body', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, MOCK_REPORT));

    await scanPackages(['express@4.18.2'], 'abc123hash', 'test-api-key');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('http://localhost:3000/api/scan');
    expect(options.method).toBe('POST');

    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer test-api-key');

    const body = JSON.parse(options.body as string) as { packages: string[]; lockfileHash: string };
    expect(body.packages).toEqual(['express@4.18.2']);
    expect(body.lockfileHash).toBe('abc123hash');
  });

  test('sends request without Authorization header when no apiKey', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, MOCK_REPORT));

    await scanPackages(['express@4.18.2'], 'hash');

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  test('returns a ScanReport on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, MOCK_REPORT));
    const result = await scanPackages(['express@4.18.2'], 'hash');
    expect(result.shareToken).toBe('abc123');
    expect(result.overallScore).toBe(74);
  });

  test('throws AuthError on 401', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: 'Unauthorized' }, false));
    await expect(scanPackages([], 'hash', 'bad-key')).rejects.toThrow(AuthError);
  });

  test('throws ApiError on 500', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(500, { error: 'Internal error' }, false));
    await expect(scanPackages([], 'hash')).rejects.toThrow(ApiError);
  });

  test('throws ApiError on 429 rate limit', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(429, { error: 'Rate limited' }, false));
    await expect(scanPackages([], 'hash')).rejects.toThrow(ApiError);
  });

  test('throws NetworkError on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(scanPackages([], 'hash')).rejects.toThrow(NetworkError);
  });

  test('throws TimeoutError when AbortController fires', async () => {
    mockFetch.mockRejectedValueOnce(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    await expect(scanPackages([], 'hash')).rejects.toThrow(TimeoutError);
  });
});

// ─── getReport ────────────────────────────────────────────────────────────────

describe('getReport', () => {
  test('calls GET /api/report/:shareToken', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, MOCK_REPORT));

    await getReport('abc123');

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/report/abc123');
    expect(options.method).toBe('GET');
  });

  test('returns ScanReport on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, MOCK_REPORT));
    const result = await getReport('abc123');
    expect(result.shareToken).toBe('abc123');
  });
});
