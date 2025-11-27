# Coverage Collection Temporarily Disabled

## Why Was This Changed?

The CI/CD pipeline was **failing** because it was trying to run `npm run test:coverage`, which is incompatible with Node.js 20. The tests themselves were passing with `npm run test:ci`, but the coverage generation step was causing the pipeline to fail.

## Issue

Coverage collection has been temporarily disabled due to a Node.js 20 compatibility issue with the `test-exclude` package (used by `babel-plugin-istanbul` for coverage instrumentation).

### Error Details

When running tests with coverage enabled (`npm run test:coverage`), the following error occurs:

```
TypeError: The "original" argument must be of type function. Received an instance of Object
    at Object.<anonymous> (node_modules/test-exclude/index.js:5:14)
    at Object.<anonymous> (node_modules/babel-plugin-istanbul/lib/index.js:18:43)
```

This is a known issue: https://github.com/istanbuljs/test-exclude/issues/52

## Current Solution

Coverage collection has been disabled in `jest.config.js`:

```javascript
collectCoverage: false,
collectCoverageFrom: [],
coverageThreshold: {},
```

## Running Tests

### ✅ Working Commands

- `npm test` - Run all tests without coverage
- `npm run test:ci` - Run tests in CI mode (used by GitHub Actions)
- `npm run test:watch` - Run tests in watch mode

### ❌ Not Working

- `npm run test:coverage` - Will fail with the `test-exclude` error

## Future Resolution

This issue will be resolved when one of the following occurs:

1. The `test-exclude` package is updated to support Node.js 20
2. An alternative coverage collection tool is adopted (e.g., `c8`, `nyc`)
3. The project downgrades to Node.js 18 (not recommended)

## Impact

- All tests still run successfully
- CI/CD pipeline is not affected (uses `npm run test:ci` which doesn't collect coverage)
- Code quality is maintained through linting and type checking
- Coverage reports are temporarily unavailable

## Workaround for Local Coverage

If you need coverage reports locally, you can:

1. Use Node.js 18 (via nvm): `nvm use 18 && npm run test:coverage`
2. Wait for the upstream fix to `test-exclude`
3. Manually review test files to ensure adequate coverage

## Related Changes

- Commit: `b65e5e1` - "Disable coverage collection due to test-exclude Node 20 incompatibility"
- Modified files:
  - `jest.config.js` - Disabled coverage collection
  - `package-lock.json` - Regenerated after dependency updates
