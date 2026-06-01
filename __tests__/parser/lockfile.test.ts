// =============================================================================
// Tests: parser/lockfile
// =============================================================================

import * as path from 'path';
import * as fs from 'fs';
import { readLockfile, extractAllDeps } from '../../src/parser/lockfile';
import { ParseError } from '../../src/types';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// ─── readLockfile ─────────────────────────────────────────────────────────────

describe('readLockfile', () => {
  test('reads v1 lockfile successfully', () => {
    const lockfile = readLockfile(FIXTURES_DIR);
    expect(lockfile).not.toBeNull();
    expect(lockfile!.lockfileVersion).toBe(1);
  });

  test('returns null when package-lock.json is missing', () => {
    const result = readLockfile('/nonexistent-dir-xyz');
    expect(result).toBeNull();
  });

  test('throws ParseError for malformed JSON', (done) => {
    const tmpDir = path.join(FIXTURES_DIR, '__tmp_bad__');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{ bad json {{');
    try {
      expect(() => readLockfile(tmpDir)).toThrow(ParseError);
      done();
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});

// ─── extractAllDeps — lockfile v1 ─────────────────────────────────────────────

describe('extractAllDeps — v1 lockfile', () => {
  let v1Lockfile: ReturnType<typeof readLockfile>;

  beforeAll(() => {
    v1Lockfile = readLockfile(FIXTURES_DIR);
  });

  test('extracts direct deps at depth 1', () => {
    const deps = extractAllDeps(v1Lockfile!);
    const names = deps.map((d) => d.name);
    expect(names).toContain('express');
    expect(names).toContain('lodash');
    expect(names).toContain('axios');
  });

  test('extracts transitive deps', () => {
    const deps = extractAllDeps(v1Lockfile!);
    const names = deps.map((d) => d.name);
    expect(names).toContain('accepts');
    expect(names).toContain('qs');
    expect(names).toContain('negotiator');
  });

  test('depth=1 returns only direct deps', () => {
    const deps = extractAllDeps(v1Lockfile!, 1);
    const names = deps.map((d) => d.name);
    // Direct deps should be present
    expect(names).toContain('express');
    expect(names).toContain('lodash');
    // Depth-2 transitive should NOT be present
    expect(names).not.toContain('accepts');
    expect(names).not.toContain('qs');
  });

  test('depth=2 includes depth-2 but not depth-3', () => {
    const deps = extractAllDeps(v1Lockfile!, 2);
    const names = deps.map((d) => d.name);
    expect(names).toContain('accepts');
    expect(names).toContain('qs');
    expect(names).not.toContain('negotiator'); // depth 3
  });

  test('deduplicates packages by name', () => {
    const deps = extractAllDeps(v1Lockfile!);
    const expressEntries = deps.filter((d) => d.name === 'express');
    expect(expressEntries.length).toBe(1);
  });

  test('dev deps flagged correctly', () => {
    const deps = extractAllDeps(v1Lockfile!);
    const jest = deps.find((d) => d.name === 'jest');
    expect(jest).toBeDefined();
    expect(jest!.isDev).toBe(true);
  });
});

// ─── extractAllDeps — lockfile v2 ─────────────────────────────────────────────

describe('extractAllDeps — v2 lockfile', () => {
  let v2Lockfile: ReturnType<typeof readLockfile>;

  beforeAll(() => {
    // Read the v2 fixture by temporarily renaming/using a different dir
    const v2FixturePath = path.join(FIXTURES_DIR, 'package-lock-v2.json');
    const raw = fs.readFileSync(v2FixturePath, 'utf-8');
    v2Lockfile = JSON.parse(raw) as ReturnType<typeof readLockfile>;
  });

  test('extracts direct packages from v2 flat map', () => {
    const deps = extractAllDeps(v2Lockfile!);
    const names = deps.map((d) => d.name);
    expect(names).toContain('express');
    expect(names).toContain('lodash');
    expect(names).toContain('axios');
  });

  test('extracts transitive packages from v2 nested paths', () => {
    const deps = extractAllDeps(v2Lockfile!);
    const names = deps.map((d) => d.name);
    expect(names).toContain('accepts');
    expect(names).toContain('qs');
    expect(names).toContain('negotiator');
  });

  test('depth=1 excludes deeply nested packages in v2', () => {
    const deps = extractAllDeps(v2Lockfile!, 1);
    const names = deps.map((d) => d.name);
    expect(names).toContain('express'); // depth 1
    expect(names).not.toContain('negotiator'); // depth 3
  });

  test('skips root package (key="")', () => {
    const deps = extractAllDeps(v2Lockfile!);
    const rootEntry = deps.find((d) => d.name === 'fixture-project');
    expect(rootEntry).toBeUndefined();
  });
});
