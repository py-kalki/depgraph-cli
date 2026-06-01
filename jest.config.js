/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Mock chalk with a simple no-op proxy so tests never touch the ESM package.
  // The chalk output is tested by stripping ANSI codes via regex anyway.
  moduleNameMapper: {
    '^chalk$': '<rootDir>/__mocks__/chalk.js',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
};

module.exports = config;
