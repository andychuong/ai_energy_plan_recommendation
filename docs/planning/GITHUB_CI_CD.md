# GitHub CI/CD Setup

## Overview

This document outlines the GitHub Actions CI/CD pipeline for the AI Energy Plan Recommendation Agent, including linting, testing, and deployment to AWS Amplify.

---

## CI/CD Pipeline Overview

```
┌─────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Linting    │  │   Testing    │  │   Security   │ │
│  │  (ESLint)    │  │   (Jest)     │  │   Scanning   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Build      │  │   Deploy     │  │   Notify     │ │
│  │  (React)    │  │  (Amplify)   │  │  (Slack)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## GitHub Actions Workflows

### 1. Main CI/CD Workflow

**File**: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18.x'
  AWS_REGION: us-east-1

jobs:
  # Linting Job
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run Prettier check
        run: npm run format:check
      
      - name: Check TypeScript
        run: npm run type-check

  # Testing Job
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

  # Build Job
  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint, test]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
          REACT_APP_GOOGLE_MAPS_API_KEY: ${{ secrets.REACT_APP_GOOGLE_MAPS_API_KEY }}
          REACT_APP_OPENAI_API_KEY: ${{ secrets.REACT_APP_OPENAI_API_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: build/
          retention-days: 7

  # Security Scanning
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # Deploy to AWS Amplify (Main branch only)
  deploy:
    name: Deploy to AWS Amplify
    runs-on: ubuntu-latest
    needs: [lint, test, build, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Deploy to Amplify
        uses: aws-amplify/amplify-cli-action@v1
        with:
          amplify_command: publish
          amplify_env: production
          amplify_app_id: ${{ secrets.AMPLIFY_APP_ID }}
```

### 2. Pull Request Workflow

**File**: `.github/workflows/pr-checks.yml`

```yaml
name: Pull Request Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  pr-checks:
    name: PR Quality Checks
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Check build
        run: npm run build
      
      - name: Comment PR with results
        uses: actions/github-script@v6
        if: always()
        with:
          script: |
            const fs = require('fs');
            const testResults = fs.existsSync('coverage/coverage-summary.json') 
              ? JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'))
              : null;
            
            const coverage = testResults 
              ? `Coverage: ${testResults.total.lines.pct}%`
              : 'Coverage: N/A';
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## PR Checks Complete ✅\n\n- Linting: Passed\n- Tests: Passed\n- Build: Passed\n- ${coverage}`
            });
```

### 3. Preview Deployment Workflow

**File**: `.github/workflows/preview-deploy.yml`

```yaml
name: Preview Deployment

on:
  pull_request:
    branches: [main, develop]

jobs:
  preview-deploy:
    name: Deploy Preview
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build preview
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
          REACT_APP_GOOGLE_MAPS_API_KEY: ${{ secrets.REACT_APP_GOOGLE_MAPS_API_KEY }}
      
      - name: Deploy to Amplify Preview
        uses: aws-amplify/amplify-cli-action@v1
        with:
          amplify_command: publish
          amplify_env: preview
          amplify_app_id: ${{ secrets.AMPLIFY_APP_ID }}
      
      - name: Comment PR with preview URL
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Preview Deployment 🚀\n\nPreview URL: https://preview-${{ github.event.pull_request.number }}.amplifyapp.com`
            });
```

---

## Linting Setup

### ESLint Configuration

**File**: `.eslintrc.json`

```json
{
  "extends": [
    "react-app",
    "react-app/jest",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "env": {
    "browser": true,
    "es2021": true,
    "jest": true
  }
}
```

### Prettier Configuration

**File**: `.prettierrc.json`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**File**: `.prettierignore`

```
node_modules
build
dist
coverage
.aws-amplify
amplify
*.log
.env
.env.local
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Testing Setup

### Jest Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/index.tsx',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
```

### React Testing Library Setup

**File**: `src/setupTests.ts`

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Example Test File

**File**: `src/components/__tests__/RecommendationCard.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { RecommendationCard } from '../RecommendationCard';

describe('RecommendationCard', () => {
  const mockRecommendation = {
    id: '1',
    planId: 'plan-1',
    rank: 1,
    projectedSavings: 500,
    explanation: 'This plan offers the best value',
    plan: {
      supplierName: 'Test Supplier',
      planName: 'Test Plan',
      ratePerKwh: 0.12,
    },
  };

  it('renders recommendation details', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);
    
    expect(screen.getByText('Test Plan')).toBeInTheDocument();
    expect(screen.getByText('Test Supplier')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('displays savings correctly', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);
    
    const savings = screen.getByText(/500/i);
    expect(savings).toBeInTheDocument();
  });
});
```

### Package.json Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:coverage": "jest --coverage",
    "test:ui": "jest --watch --coverage"
  }
}
```

---

## GitHub Secrets Configuration

### Required Secrets

Set these in GitHub repository settings → Secrets and variables → Actions:

1. **AWS_ACCESS_KEY_ID**: AWS access key for Amplify deployment
2. **AWS_SECRET_ACCESS_KEY**: AWS secret key for Amplify deployment
3. **AMPLIFY_APP_ID**: AWS Amplify app ID
4. **REACT_APP_API_URL**: API endpoint URL
5. **REACT_APP_GOOGLE_MAPS_API_KEY**: Google Maps API key
6. **REACT_APP_OPENAI_API_KEY**: OpenAI API key (for build-time)
7. **SNYK_TOKEN**: Snyk security scanning token (optional)

### How to Set Secrets

1. Go to repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its value
4. Secrets are encrypted and only available in workflows

---

## AWS Amplify Integration

### Amplify Console Integration

AWS Amplify can automatically deploy from GitHub:

1. **Connect Repository**:
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Connect to GitHub repository
   - Select branch (main)

2. **Build Settings**:
   - Amplify auto-detects React apps
   - Custom build settings can be added

**File**: `amplify.yml` (optional, for custom build)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Manual Deployment via GitHub Actions

If not using Amplify Console auto-deploy:

```yaml
- name: Deploy to Amplify
  uses: aws-amplify/amplify-cli-action@v1
  with:
    amplify_command: publish
    amplify_env: production
    amplify_app_id: ${{ secrets.AMPLIFY_APP_ID }}
```

---

## Code Quality Gates

### Pre-commit Hooks (Optional)

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run format:check
npm run type-check
```

**Installation**:
```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npm run lint-staged"
```

**File**: `package.json`

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

---

## Workflow Status Badges

Add to README.md:

```markdown
![CI/CD](https://github.com/your-org/arbor-ai-energy/workflows/CI/CD%20Pipeline/badge.svg)
![Tests](https://github.com/your-org/arbor-ai-energy/workflows/CI/CD%20Pipeline/badge.svg?branch=main)
![Coverage](https://codecov.io/gh/your-org/arbor-ai-energy/branch/main/graph/badge.svg)
```

---

## Monitoring & Notifications

### Slack Notifications (Optional)

**File**: `.github/workflows/notify.yml`

```yaml
name: Notify on Deployment

on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types:
      - completed

jobs:
  notify:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion != 'success' }}
    
    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ github.event.workflow_run.conclusion }}
          text: 'Deployment failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Best Practices

### 1. Branch Protection Rules
- Require PR reviews
- Require status checks to pass
- Require branches to be up to date
- Require conversation resolution

### 2. Workflow Optimization
- Use caching for dependencies
- Run jobs in parallel when possible
- Use matrix builds for multiple Node versions
- Set appropriate timeouts

### 3. Security
- Never commit secrets to repository
- Use GitHub Secrets for sensitive data
- Regularly update dependencies
- Run security scans in CI

### 4. Performance
- Cache npm dependencies
- Use build artifacts
- Optimize test execution
- Parallelize jobs

---

## Troubleshooting

### Common Issues

1. **Build fails in CI but works locally**
   - Check environment variables
   - Verify Node version matches
   - Check for platform-specific code

2. **Tests timeout**
   - Increase timeout in jest.config.js
   - Check for hanging async operations
   - Verify test cleanup

3. **Deployment fails**
   - Verify AWS credentials
   - Check Amplify app ID
   - Verify IAM permissions

4. **Linting errors**
   - Run `npm run lint:fix` locally
   - Check ESLint configuration
   - Verify Prettier formatting

---

## Next Steps

1. **Set up GitHub repository**
   - Create repository
   - Add workflows to `.github/workflows/`
   - Configure secrets

2. **Configure linting**
   - Install ESLint and Prettier
   - Add configuration files
   - Test locally

3. **Set up testing**
   - Install Jest and React Testing Library
   - Write initial tests
   - Configure coverage

4. **Connect AWS Amplify**
   - Create Amplify app
   - Connect GitHub repository
   - Configure build settings

5. **Test CI/CD pipeline**
   - Push to repository
   - Verify workflows run
   - Check deployment

