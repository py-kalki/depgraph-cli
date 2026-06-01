// =============================================================================
// Tests: commands/check
// =============================================================================

import * as path from 'path';
import { runCheck } from '../../src/commands/check';
import * as apiClient from '../../src/api/client';
import { TimeoutError, AuthError } from '../../src/types';
import type { ScanReport } from '../../src/api/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURES_DIR = path.join(__dirname, '..', 'parser', 'fixtures');

const MOCK_REPORT: ScanReport = {
  id: 'check-rep-1',
  shareToken: 'checkToken',
  overallScore: 72,
  totalDeps: 5,
  criticalCount: 0,
  highCount: 1,
  mediumCount: 1,
  lowCount: 2,
  healthyCount: 1,
  projectId: null,
  createdAt: new Date().toISOString(),
  packages: [],
};

// ─── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../src/api/client');
jest.mock('../../src/renderer/spinner', () => ({
  startSpinner: () => ({ stop: jest.fn() }),
  clearSpinner: jest.fn(),
  stopSpinner: jest.fn(),
}));
// Mock renderers so chalk is not touched in this test suite
jest.mock('../../src/renderer/terminal', () => ({
  renderReport: jest.fn(),
  printError: jest.fn(),
  printWarning: jest.fn(),
}));
jest.mock('../../src/renderer/json', () => ({
  renderJson: jest.fn((report: ScanReport) => {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }),
}));

const mockScanPackages = apiClient.scanPackages as jest.MockedFunction<typeof apiClient.scanPackages>;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Mock process.exit inside beforeEach so Jest can restore it cleanly
  jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
    throw new Error(`process.exit(${String(code)})`);
  });
  jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  mockScanPackages.mockResolvedValue(MOCK_REPORT);
});

afterEach(() => {
  jest.restoreAllMocks();
  mockScanPackages.mockReset();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runCheck', () => {
  test('calls scanPackages with a package list and lockfileHash', async () => {
    await expect(
      runCheck({ path: FIXTURES_DIR, format: 'terminal', color: false }),
    ).rejects.toThrow('process.exit(0)');

    expect(mockScanPackages).toHaveBeenCalledTimes(1);
    const [packages, lockfileHash] = mockScanPackages.mock.calls[0]!;
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);
    expect(typeof lockfileHash).toBe('string');
    expect(lockfileHash.length).toBe(64); // SHA-256 hex = 64 chars
  });

  test('exits 0 on success with score above threshold', async () => {
    await expect(
      runCheck({
        path: FIXTURES_DIR,
        format: 'terminal',
        threshold: 60,
        color: false,
      }),
    ).rejects.toThrow('process.exit(0)');
  });

  test('exits 1 when score < --threshold', async () => {
    await expect(
      runCheck({
        path: FIXTURES_DIR,
        format: 'terminal',
        threshold: 80, // overallScore=72, breaches threshold
        color: false,
      }),
    ).rejects.toThrow('process.exit(1)');
  });

  test('exits 2 on TimeoutError from API', async () => {
    mockScanPackages.mockRejectedValueOnce(new TimeoutError());
    await expect(
      runCheck({ path: FIXTURES_DIR, format: 'terminal', color: false }),
    ).rejects.toThrow('process.exit(2)');
  });

  test('exits 2 on AuthError from API', async () => {
    mockScanPackages.mockRejectedValueOnce(new AuthError());
    await expect(
      runCheck({ path: FIXTURES_DIR, format: 'terminal', color: false }),
    ).rejects.toThrow('process.exit(2)');
  });

  test('exits 2 when path does not contain package.json', async () => {
    await expect(
      runCheck({ path: '/nonexistent-dir-xyz', format: 'terminal', color: false }),
    ).rejects.toThrow('process.exit(2)');
  });

  test('renders JSON when --format json', async () => {
    let stdoutCapture = '';
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutCapture += String(chunk);
      return true;
    });

    await expect(
      runCheck({ path: FIXTURES_DIR, format: 'json', color: false }),
    ).rejects.toThrow('process.exit(0)');

    // Verify the JSON output is parseable and matches expected shape
    const parsed = JSON.parse(stdoutCapture) as ScanReport;
    expect(parsed.overallScore).toBe(72);
  });
});
