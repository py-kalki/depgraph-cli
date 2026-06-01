// =============================================================================
// Tests: renderer/json
// =============================================================================

import { renderJson } from '../../src/renderer/json';
import type { ScanReport } from '../../src/api/types';

const MOCK_REPORT: ScanReport = {
  id: 'rep-json-1',
  shareToken: 'jsonToken',
  overallScore: 55,
  totalDeps: 2,
  criticalCount: 1,
  highCount: 0,
  mediumCount: 0,
  lowCount: 1,
  healthyCount: 0,
  projectId: null,
  createdAt: new Date().toISOString(),
  packages: [],
};

describe('renderJson', () => {
  let stdoutOutput: string;

  beforeEach(() => {
    stdoutOutput = '';
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutOutput += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('writes valid JSON to stdout', () => {
    renderJson(MOCK_REPORT);
    const parsed = JSON.parse(stdoutOutput) as ScanReport;
    expect(parsed.shareToken).toBe('jsonToken');
    expect(parsed.overallScore).toBe(55);
  });

  test('output is indented (pretty-printed)', () => {
    renderJson(MOCK_REPORT);
    // Pretty JSON contains newlines and spaces
    expect(stdoutOutput).toContain('\n');
    expect(stdoutOutput).toContain('  ');
  });

  test('output ends with a newline', () => {
    renderJson(MOCK_REPORT);
    expect(stdoutOutput.endsWith('\n')).toBe(true);
  });
});
