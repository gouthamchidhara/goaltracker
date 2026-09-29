/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        strict: true,
        types: ['jest'],
        paths: { '@/*': ['./src/*'] },
        esModuleInterop: true,
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        skipLibCheck: true,
      },
    }],
  },
};