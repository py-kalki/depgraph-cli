// =============================================================================
// Tests: renderer/terminal
// =============================================================================

import { renderReport, renderProgressBar, printError } from '../../src/renderer/terminal';
import type { ScanReport } from '../../src/api/types';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeMockReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    id: 'rep-1',
    shareToken: 'testToken1',
    overallScore: 71,
    totalDeps: 5,
    criticalCount: 1,
    highCount: 1,
    mediumCount: 1,
    lowCount: 1,
    healthyCount: 1,
    projectId: null,
    createdAt: new Date().toISOString(),
    packages: [
      {
        packageName: 'event-stream',
        packageVersion: '3.3.4',
        ecosystem: 'npm',
        score: 12,
        riskLevel: 'critical',
        abandonmentRisk: true,
        topFactors: [
          { label: 'Maintenance', reason: 'No commits in over 4 years.' },
        ],
        alternatives: [],
        computedAt: new Date().toISOString(),
        dimensions: {} as never,
      },
      {
        packageName: 'express',
        packageVersion: '4.18.2',
        ecosystem: 'npm',
        score: 74,
        riskLevel: 'low',
        abandonmentRisk: false,
        topFactors: [],
        alternatives: [],
        computedAt: new Date().toISOString(),
        dimensions: {} as never,
      },
    ],
    ...overrides,
  };
}

// ─── Capture stdout/stderr ─────────────────────────────────────────────────────

let stdoutOutput: string;
let stderrOutput: string;

beforeEach(() => {
  stdoutOutput = '';
  stderrOutput = '';
  jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdoutOutput += String(chunk);
    return true;
  });
  jest.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderrOutput += String(chunk);
    return true;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('renderReport', () => {
  test('outputs the health score line', () => {
    renderReport(makeMockReport());
    expect(stdoutOutput).toContain('71 / 100');
  });

  test('outputs CRITICAL section when critical deps exist', () => {
    renderReport(makeMockReport());
    expect(stdoutOutput).toContain('CRITICAL');
  });

  test('outputs the package name for critical dep', () => {
    renderReport(makeMockReport());
    expect(stdoutOutput).toContain('event-stream');
  });

  test('outputs the abandonment risk flag for flagged packages', () => {
    renderReport(makeMockReport());
    expect(stdoutOutput).toContain('ABANDONMENT RISK');
  });

  test('outputs the share URL', () => {
    renderReport(makeMockReport());
    expect(stdoutOutput).toContain('depgraph.vedanshh.dev/r/testToken1');
  });

  test('outputs dep count in header', () => {
    renderReport(makeMockReport());
    expect(stdoutOutput).toContain('5 dependencies');
  });

  test('renders correctly with no critical deps', () => {
    const report = makeMockReport({ criticalCount: 0, packages: [] });
    renderReport(report);
    // Should not crash and should contain score
    expect(stdoutOutput).toContain('71 / 100');
    expect(stdoutOutput).not.toContain('CRITICAL');
  });
});

describe('renderProgressBar', () => {
  test('returns 10-char string', () => {
    const bar = renderProgressBar(50);
    // Strip ANSI codes
    const clean = bar.replace(/\x1B\[[0-9;]*m/g, '');
    expect(clean.length).toBe(10);
  });

  test('score=0 → all empty blocks', () => {
    const bar = renderProgressBar(0);
    const clean = bar.replace(/\x1B\[[0-9;]*m/g, '');
    expect(clean).toBe('░'.repeat(10));
  });

  test('score=100 → all filled blocks', () => {
    const bar = renderProgressBar(100);
    const clean = bar.replace(/\x1B\[[0-9;]*m/g, '');
    expect(clean).toBe('▓'.repeat(10));
  });

  test('score=50 → 5 filled + 5 empty', () => {
    const bar = renderProgressBar(50);
    const clean = bar.replace(/\x1B\[[0-9;]*m/g, '');
    expect(clean).toBe('▓▓▓▓▓░░░░░');
  });
});

describe('printError', () => {
  test('writes to stderr', () => {
    printError('Something went wrong');
    expect(stderrOutput).toContain('Something went wrong');
  });
});
