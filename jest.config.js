module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^shared/(.*)$': '<rootDir>/shared/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  // Coverage collection disabled due to test-exclude incompatibility with Node.js 20
  // See: https://github.com/istanbuljs/test-exclude/issues/52
  collectCoverage: false,
  collectCoverageFrom: [],
  coverageThreshold: {},
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': '<rootDir>/jest-transform.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
