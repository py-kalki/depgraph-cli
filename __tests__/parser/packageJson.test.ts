// =============================================================================
// Tests: parser/packageJson
// =============================================================================

import * as path from 'path';
import { readPackageJson, extractDirectDeps } from '../../src/parser/packageJson';
import { ParseError } from '../../src/types';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('readPackageJson', () => {
  test('reads and parses the fixture package.json', () => {
    const pkg = readPackageJson(FIXTURES_DIR);
    expect(pkg.name).toBe('fixture-project');
    expect(pkg.version).toBe('1.0.0');
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.devDependencies).toBeDefined();
  });

  test('throws ParseError when package.json is missing', () => {
    expect(() => readPackageJson('/nonexistent-dir-xyz')).toThrow(ParseError);
  });
});

describe('extractDirectDeps', () => {
  test('extracts production dependencies with isDev=false', () => {
    const pkg = readPackageJson(FIXTURES_DIR);
    const deps = extractDirectDeps(pkg);

    const express = deps.find((d) => d.name === 'express');
    expect(express).toBeDefined();
    expect(express!.isDev).toBe(false);
    expect(express!.depth).toBe(0);
  });

  test('extracts devDependencies with isDev=true', () => {
    const pkg = readPackageJson(FIXTURES_DIR);
    const deps = extractDirectDeps(pkg);

    const jest = deps.find((d) => d.name === 'jest');
    expect(jest).toBeDefined();
    expect(jest!.isDev).toBe(true);
  });

  test('normalizes version ranges to clean version strings', () => {
    const pkg = readPackageJson(FIXTURES_DIR);
    const deps = extractDirectDeps(pkg);

    const express = deps.find((d) => d.name === 'express');
    // "^4.18.2" should normalize to "4.18.2"
    expect(express!.version).toBe('4.18.2');

    const lodash = deps.find((d) => d.name === 'lodash');
    // "^4.17.21" should normalize to "4.17.21"
    expect(lodash!.version).toBe('4.17.21');
  });

  test('returns all deps from dependencies + devDependencies', () => {
    const pkg = readPackageJson(FIXTURES_DIR);
    const deps = extractDirectDeps(pkg);
    // 3 prod deps + 2 dev deps = 5 total
    expect(deps.length).toBe(5);
  });

  test('returns empty array when dependencies key is missing', () => {
    const deps = extractDirectDeps({});
    expect(deps).toEqual([]);
  });

  test('handles package with only devDependencies', () => {
    const deps = extractDirectDeps({
      devDependencies: { typescript: '^5.0.0' },
    });
    expect(deps.length).toBe(1);
    expect(deps[0]!.isDev).toBe(true);
    expect(deps[0]!.name).toBe('typescript');
  });
});
