# QA Automation Setup and Configuration

## Table of Contents
1. [Automation Architecture](#automation-architecture)
2. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
3. [Test Automation Framework](#test-automation-framework)
4. [Quality Gates Implementation](#quality-gates-implementation)
5. [Code Coverage Setup](#code-coverage-setup)
6. [Security Scanning Automation](#security-scanning-automation)
7. [Performance Testing Automation](#performance-testing-automation)
8. [Deployment Automation](#deployment-automation)
9. [Monitoring and Alerting](#monitoring-and-alerting)
10. [Tool Integrations](#tool-integrations)

## Automation Architecture

### 🏗️ Overall Architecture

```mermaid
graph TD
    A[Developer Push] --> B[GitHub Actions]
    B --> C[Pre-commit Hooks]
    C --> D[Linting & Format]
    D --> E[Unit Tests]
    E --> F[Integration Tests]
    F --> G[E2E Tests]
    G --> H[Security Scan]
    H --> I[Performance Tests]
    I --> J{Quality Gates}
    J -->|Pass| K[Build & Deploy]
    J -->|Fail| L[Block & Notify]
    K --> M[Post-deploy Tests]
    M --> N[Monitoring]
```

### 🎯 Automation Objectives
- **Fast Feedback**: Provide rapid feedback on code quality
- **Consistency**: Ensure consistent testing across environments
- **Reliability**: Reduce manual testing burden and human error
- **Scalability**: Support growing team and codebase
- **Quality Assurance**: Maintain high quality standards automatically

## CI/CD Pipeline Configuration

### 🔄 GitHub Actions Workflows

#### Main CI/CD Pipeline
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  POSTGRES_VERSION: '14'
  REDIS_VERSION: '6'

jobs:
  # Code Quality Checks
  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit

      - name: Run TypeScript check
        run: npm run typecheck

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier check
        run: npm run format:check

      - name: Check for security vulnerabilities
        run: npm audit --audit-level high

  # Unit Tests
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: code-quality
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit-tests
          name: unit-tests-${{ matrix.node-version }}

      - name: Store coverage reports
        uses: actions/upload-artifact@v3
        with:
          name: coverage-reports-${{ matrix.node-version }}
          path: coverage/

  # Integration Tests
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: unit-tests
    
    services:
      postgres:
        image: postgres:${{ env.POSTGRES_VERSION }}
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:${{ env.REDIS_VERSION }}
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

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

      - name: Wait for PostgreSQL
        run: |
          until pg_isready -h localhost -p 5432 -U testuser; do
            echo "Waiting for PostgreSQL..."
            sleep 2
          done

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgres://testuser:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration:coverage
        env:
          DATABASE_URL: postgres://testuser:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

      - name: Upload integration test coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: integration-tests

  # End-to-End Tests
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    needs: integration-tests
    
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

      - name: Start test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d
          ./scripts/wait-for-services.sh

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000

      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-test-results
          path: test-results/

      - name: Cleanup test environment
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v

  # Security Scanning
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: code-quality
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript

      - name: Run npm audit
        run: npm audit --audit-level high --omit dev

  # Performance Tests
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    timeout-minutes: 25
    needs: integration-tests
    if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
    
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

      - name: Start test environment
        run: |
          docker-compose -f docker-compose.perf.yml up -d
          ./scripts/wait-for-services.sh

      - name: Run performance tests
        run: npm run test:performance
        env:
          PERFORMANCE_TARGET: http://localhost:3000

      - name: Upload performance test results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results/

      - name: Comment PR with performance results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const path = 'performance-results/summary.json';
            if (fs.existsSync(path)) {
              const results = JSON.parse(fs.readFileSync(path, 'utf8'));
              const body = `## Performance Test Results\n\n${results.summary}`;
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: body
              });
            }

  # Build and Deploy
  build-deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests, security-scan]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
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

      - name: Build Docker image
        run: |
          docker build -t rps-bot:${{ github.sha }} .
          docker tag rps-bot:${{ github.sha }} rps-bot:latest

      - name: Deploy to staging
        run: ./scripts/deploy-staging.sh
        env:
          DOCKER_IMAGE: rps-bot:${{ github.sha }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          STAGING_URL: ${{ secrets.STAGING_URL }}

      - name: Deploy to production
        if: success()
        run: ./scripts/deploy-production.sh
        env:
          DOCKER_IMAGE: rps-bot:${{ github.sha }}
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}

      - name: Post-deployment verification
        run: npm run test:post-deploy
        env:
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
```

#### Pull Request Workflow
```yaml
# .github/workflows/pr-checks.yml
name: Pull Request Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-validation:
    name: PR Validation
    runs-on: ubuntu-latest
    
    steps:
      - name: Check PR title format
        uses: deepakputhraya/action-pr-title@master
        with:
          regex: '^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}'

      - name: Check for breaking changes
        uses: actions/github-script@v6
        with:
          script: |
            const { data: pr } = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
            });
            
            if (pr.body && pr.body.includes('BREAKING CHANGE')) {
              github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                labels: ['breaking-change']
              });
            }

      - name: Auto-assign reviewers
        uses: kentaro-m/auto-assign-action@v1.2.5
        with:
          configuration-path: '.github/auto-assign.yml'

  size-check:
    name: Bundle Size Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and analyze bundle
        run: |
          npm run build
          npm run analyze:bundle

      - name: Comment bundle size
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('bundle-analysis.json')) {
              const analysis = JSON.parse(fs.readFileSync('bundle-analysis.json', 'utf8'));
              const comment = `## Bundle Size Analysis\n\n${analysis.summary}`;
              
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
            }
```

## Test Automation Framework

### 🧪 Jest Configuration Enhancement

#### Enhanced Jest Setup
```javascript
// jest.config.js
module.exports = {
  preset: '@nestjs/testing',
  rootDir: '.',
  testEnvironment: 'node',
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.enum.ts',
    '!src/main.ts',
    '!src/migrations/**',
    '!src/seeds/**'
  ],
  
  coverageDirectory: './coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover',
    'cobertura'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Component-specific thresholds
    'src/game/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/tournament/': {
      branches: 88,
      functions: 88,
      lines: 88,
      statements: 88
    }
  },
  
  // Test setup
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts',
    '<rootDir>/test/custom-matchers.ts'
  ],
  
  // Module mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  
  // Timeout and performance
  testTimeout: 30000,
  maxWorkers: '50%',
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'RPS Tournament Bot Test Report',
        outputPath: './coverage/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        theme: 'darkTheme'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{displayName}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-sonar-reporter',
      {
        outputDirectory: './coverage',
        outputName: 'test-report.xml'
      }
    ]
  ],
  
  // Project-specific configurations
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/unit-setup.ts']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/integration-setup.ts'],
      testTimeout: 60000
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/e2e-setup.ts'],
      testTimeout: 120000
    }
  ]
};
```

#### Custom Test Utilities
```typescript
// test/utils/test-automation.ts
export class TestAutomation {
  /**
   * Automatically generate test cases from function signatures
   */
  static generateTestCases<T>(
    service: T,
    methodName: keyof T,
    testScenarios: Array<{
      description: string;
      input: any[];
      expected: any;
      shouldThrow?: boolean;
    }>
  ) {
    describe(`${String(methodName)} - Auto-generated Tests`, () => {
      testScenarios.forEach(({ description, input, expected, shouldThrow }) => {
        it(description, async () => {
          const method = service[methodName] as any;
          
          if (shouldThrow) {
            await expect(method.apply(service, input)).rejects.toThrow(expected);
          } else {
            const result = await method.apply(service, input);
            expect(result).toEqual(expected);
          }
        });
      });
    });
  }

  /**
   * Generate property-based test cases
   */
  static generatePropertyTests<T>(
    property: (input: T) => boolean,
    generator: () => T,
    iterations = 100
  ) {
    it(`Property test - ${iterations} iterations`, () => {
      for (let i = 0; i < iterations; i++) {
        const input = generator();
        expect(property(input)).toBe(true);
      }
    });
  }

  /**
   * Generate mutation testing scenarios
   */
  static generateMutationTests(
    originalFunction: Function,
    mutations: Array<{
      name: string;
      mutatedFunction: Function;
      shouldFailWith: any[];
    }>
  ) {
    describe('Mutation Tests', () => {
      mutations.forEach(({ name, mutatedFunction, shouldFailWith }) => {
        it(`should detect mutation: ${name}`, () => {
          shouldFailWith.forEach(input => {
            const originalResult = originalFunction(input);
            const mutatedResult = mutatedFunction(input);
            expect(originalResult).not.toEqual(mutatedResult);
          });
        });
      });
    });
  }
}
```

### 🎯 Automated Test Generation

#### Test Case Generator
```typescript
// scripts/generate-tests.ts
import { readFileSync, writeFileSync } from 'fs';
import { parse } from '@typescript-eslint/parser';
import { TSESTree } from '@typescript-eslint/types';

export class TestGenerator {
  /**
   * Generate basic test structure for a service class
   */
  static generateServiceTests(filePath: string): string {
    const content = readFileSync(filePath, 'utf-8');
    const ast = parse(content, {
      loc: true,
      range: true,
      sourceType: 'module',
      ecmaVersion: 2020
    });

    const className = this.extractClassName(ast);
    const methods = this.extractMethods(ast);
    
    return this.generateTestTemplate(className, methods);
  }

  private static extractClassName(ast: TSESTree.Program): string {
    const classDeclaration = ast.body.find(
      node => node.type === 'ClassDeclaration'
    ) as TSESTree.ClassDeclaration;
    
    return classDeclaration?.id?.name || 'UnknownClass';
  }

  private static extractMethods(ast: TSESTree.Program): Array<{
    name: string;
    parameters: string[];
    returnType: string;
    isAsync: boolean;
  }> {
    // Extract method information from AST
    // Implementation details...
    return [];
  }

  private static generateTestTemplate(
    className: string,
    methods: Array<{ name: string; parameters: string[]; returnType: string; isAsync: boolean }>
  ): string {
    return `
import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from './${className.toLowerCase()}';

describe('${className}', () => {
  let service: ${className};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${className}],
    }).compile();

    service = module.get<${className}>(${className});
  });

  ${methods.map(method => this.generateMethodTest(method)).join('\n\n')}
});
`;
  }

  private static generateMethodTest(method: {
    name: string;
    parameters: string[];
    returnType: string;
    isAsync: boolean;
  }): string {
    const asyncKeyword = method.isAsync ? 'async ' : '';
    const awaitKeyword = method.isAsync ? 'await ' : '';

    return `
  describe('${method.name}', () => {
    it('should be defined', () => {
      expect(service.${method.name}).toBeDefined();
    });

    it('should return expected result', ${asyncKeyword}() => {
      // Arrange
      ${method.parameters.map(param => `const ${param} = /* mock value */;`).join('\n      ')}

      // Act
      const result = ${awaitKeyword}service.${method.name}(${method.parameters.join(', ')});

      // Assert
      expect(result).toBeDefined();
      // Add specific assertions based on expected behavior
    });

    it('should handle error cases', ${asyncKeyword}() => {
      // Test error scenarios
      ${awaitKeyword}expect(service.${method.name}(/* invalid input */)).${method.isAsync ? 'rejects.toThrow()' : 'toThrow()'};
    });
  });`;
  }
}

// Usage script
if (require.main === module) {
  const args = process.argv.slice(2);
  const filePath = args[0];
  
  if (!filePath) {
    console.error('Usage: ts-node generate-tests.ts <file-path>');
    process.exit(1);
  }

  try {
    const testContent = TestGenerator.generateServiceTests(filePath);
    const outputPath = filePath.replace('.ts', '.spec.ts');
    writeFileSync(outputPath, testContent);
    console.log(`Generated test file: ${outputPath}`);
  } catch (error) {
    console.error('Error generating tests:', error);
    process.exit(1);
  }
}
```

## Quality Gates Implementation

### 🚪 Quality Gate Configuration

#### Pre-commit Quality Gates
```bash
#!/bin/sh
# .githooks/pre-commit

echo "🔍 Running pre-commit quality checks..."

# 1. TypeScript compilation check
echo "📝 Checking TypeScript compilation..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed. Please fix errors before committing."
    exit 1
fi

# 2. Linting check
echo "🧹 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix linting errors before committing."
    exit 1
fi

# 3. Code formatting check
echo "✨ Checking code formatting..."
npm run format:check
if [ $? -ne 0 ]; then
    echo "❌ Code formatting issues found. Run 'npm run format' to fix."
    exit 1
fi

# 4. Unit tests
echo "🧪 Running unit tests..."
npm run test:unit:changed
if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed. Please fix failing tests before committing."
    exit 1
fi

# 5. Security check
echo "🔒 Running security audit..."
npm audit --audit-level high
if [ $? -ne 0 ]; then
    echo "⚠️  Security vulnerabilities found. Please review and fix."
    exit 1
fi

echo "✅ All pre-commit checks passed!"
```

#### Quality Gate Enforcement
```typescript
// scripts/quality-gate.ts
interface QualityMetrics {
  codeCoverage: number;
  testPassRate: number;
  lintingErrors: number;
  securityVulnerabilities: number;
  performanceScore: number;
  duplicateCodePercentage: number;
}

class QualityGateEnforcer {
  private readonly thresholds = {
    codeCoverage: 85,
    testPassRate: 100,
    lintingErrors: 0,
    securityVulnerabilities: 0,
    performanceScore: 85,
    duplicateCodePercentage: 5
  };

  async enforceQualityGates(): Promise<boolean> {
    console.log('🚪 Enforcing quality gates...');
    
    const metrics = await this.collectMetrics();
    const violations = this.checkViolations(metrics);
    
    if (violations.length > 0) {
      console.error('❌ Quality gate violations found:');
      violations.forEach(violation => {
        console.error(`  - ${violation.metric}: ${violation.actual} (threshold: ${violation.threshold})`);
      });
      return false;
    }

    console.log('✅ All quality gates passed!');
    return true;
  }

  private async collectMetrics(): Promise<QualityMetrics> {
    return {
      codeCoverage: await this.getCoveragePercentage(),
      testPassRate: await this.getTestPassRate(),
      lintingErrors: await this.getLintingErrors(),
      securityVulnerabilities: await this.getSecurityVulnerabilities(),
      performanceScore: await this.getPerformanceScore(),
      duplicateCodePercentage: await this.getDuplicateCodePercentage()
    };
  }

  private checkViolations(metrics: QualityMetrics): Array<{
    metric: string;
    actual: number;
    threshold: number;
  }> {
    const violations = [];

    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const actual = metrics[metric as keyof QualityMetrics];
      
      const isViolation = metric === 'duplicateCodePercentage' || 
                         metric === 'lintingErrors' || 
                         metric === 'securityVulnerabilities'
        ? actual > threshold
        : actual < threshold;

      if (isViolation) {
        violations.push({ metric, actual, threshold });
      }
    });

    return violations;
  }

  private async getCoveragePercentage(): Promise<number> {
    // Read coverage report and extract overall percentage
    try {
      const coverageReport = JSON.parse(
        require('fs').readFileSync('./coverage/coverage-summary.json', 'utf8')
      );
      return coverageReport.total.lines.pct;
    } catch {
      return 0;
    }
  }

  private async getTestPassRate(): Promise<number> {
    // Calculate test pass rate from test results
    try {
      const testResults = JSON.parse(
        require('fs').readFileSync('./coverage/test-results.json', 'utf8')
      );
      const total = testResults.numTotalTests;
      const passed = testResults.numPassedTests;
      return total > 0 ? (passed / total) * 100 : 0;
    } catch {
      return 0;
    }
  }

  // Additional metric collection methods...
}

// CLI usage
if (require.main === module) {
  const enforcer = new QualityGateEnforcer();
  enforcer.enforceQualityGates().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
```

## Code Coverage Setup

### 📊 Enhanced Coverage Configuration

#### Coverage Collection Scripts
```json
{
  "scripts": {
    "test:coverage": "jest --coverage --coverageReporters=lcov --coverageReporters=text --coverageReporters=html",
    "test:coverage:watch": "jest --coverage --watch --coverageReporters=text",
    "test:coverage:unit": "jest --testPathPattern=src/.*\\.spec\\.ts$ --coverage",
    "test:coverage:integration": "jest --testPathPattern=test/integration/.*\\.spec\\.ts$ --coverage",
    "test:coverage:threshold": "jest --coverage --coverageThreshold='{}' --passWithNoTests=false",
    "coverage:merge": "node scripts/merge-coverage.js",
    "coverage:report": "nyc report --reporter=html --reporter=text --reporter=lcov",
    "coverage:upload": "codecov -f coverage/lcov.info -F unit,integration",
    "coverage:badge": "node scripts/generate-coverage-badge.js"
  }
}
```

#### Coverage Analysis Tools
```typescript
// scripts/coverage-analyzer.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CoverageData {
  lines: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}

interface FileCoverage extends CoverageData {
  path: string;
}

class CoverageAnalyzer {
  private coverageDir = './coverage';

  async generateCoverageReport(): Promise<void> {
    const summary = this.loadCoverageSummary();
    const filesCoverage = this.loadFilesCoverage();
    
    const report = {
      overall: summary.total,
      files: filesCoverage,
      analysis: this.analyzeCoverage(filesCoverage),
      recommendations: this.generateRecommendations(filesCoverage)
    };

    this.writeReport(report);
    this.generateBadges(summary.total);
  }

  private loadCoverageSummary(): any {
    const summaryPath = join(this.coverageDir, 'coverage-summary.json');
    return JSON.parse(readFileSync(summaryPath, 'utf8'));
  }

  private loadFilesCoverage(): FileCoverage[] {
    const summaryData = this.loadCoverageSummary();
    
    return Object.entries(summaryData)
      .filter(([path]) => path !== 'total')
      .map(([path, data]: [string, any]) => ({
        path,
        lines: data.lines,
        functions: data.functions,
        statements: data.statements,
        branches: data.branches
      }));
  }

  private analyzeCoverage(files: FileCoverage[]): {
    wellTested: FileCoverage[];
    needsAttention: FileCoverage[];
    poorCoverage: FileCoverage[];
  } {
    return {
      wellTested: files.filter(f => f.lines.pct >= 90),
      needsAttention: files.filter(f => f.lines.pct >= 70 && f.lines.pct < 90),
      poorCoverage: files.filter(f => f.lines.pct < 70)
    };
  }

  private generateRecommendations(files: FileCoverage[]): string[] {
    const recommendations = [];
    const analysis = this.analyzeCoverage(files);

    if (analysis.poorCoverage.length > 0) {
      recommendations.push(
        `Priority: Add tests for ${analysis.poorCoverage.length} files with <70% coverage`
      );
    }

    if (analysis.needsAttention.length > 0) {
      recommendations.push(
        `Improve coverage for ${analysis.needsAttention.length} files below 90%`
      );
    }

    // Check for files with low branch coverage
    const lowBranchCoverage = files.filter(f => f.branches.pct < 80);
    if (lowBranchCoverage.length > 0) {
      recommendations.push(
        `Focus on branch coverage for ${lowBranchCoverage.length} files`
      );
    }

    return recommendations;
  }

  private writeReport(report: any): void {
    const reportPath = join(this.coverageDir, 'coverage-analysis.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdown = this.generateMarkdownReport(report);
    const markdownPath = join(this.coverageDir, 'coverage-report.md');
    writeFileSync(markdownPath, markdown);
  }

  private generateMarkdownReport(report: any): string {
    return `
# Coverage Report

## Overall Coverage
- **Lines**: ${report.overall.lines.pct}% (${report.overall.lines.covered}/${report.overall.lines.total})
- **Functions**: ${report.overall.functions.pct}% (${report.overall.functions.covered}/${report.overall.functions.total})
- **Statements**: ${report.overall.statements.pct}% (${report.overall.statements.covered}/${report.overall.statements.total})
- **Branches**: ${report.overall.branches.pct}% (${report.overall.branches.covered}/${report.overall.branches.total})

## Files Needing Attention
${report.analysis.poorCoverage.map((file: FileCoverage) => 
  `- **${file.path}**: ${file.lines.pct}% line coverage`
).join('\n')}

## Recommendations
${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

Generated on: ${new Date().toISOString()}
`;
  }

  private generateBadges(coverage: CoverageData): void {
    const badges = {
      lines: this.createBadge('coverage-lines', `${coverage.lines.pct}%`, this.getColorForPercentage(coverage.lines.pct)),
      functions: this.createBadge('coverage-functions', `${coverage.functions.pct}%`, this.getColorForPercentage(coverage.functions.pct)),
      statements: this.createBadge('coverage-statements', `${coverage.statements.pct}%`, this.getColorForPercentage(coverage.statements.pct)),
      branches: this.createBadge('coverage-branches', `${coverage.branches.pct}%`, this.getColorForPercentage(coverage.branches.pct))
    };

    writeFileSync(
      join(this.coverageDir, 'badges.json'),
      JSON.stringify(badges, null, 2)
    );
  }

  private createBadge(label: string, message: string, color: string): string {
    return `https://img.shields.io/badge/${label}-${message}-${color}`;
  }

  private getColorForPercentage(pct: number): string {
    if (pct >= 90) return 'brightgreen';
    if (pct >= 80) return 'green';
    if (pct >= 70) return 'yellow';
    if (pct >= 60) return 'orange';
    return 'red';
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new CoverageAnalyzer();
  analyzer.generateCoverageReport().then(() => {
    console.log('✅ Coverage report generated successfully');
  }).catch(error => {
    console.error('❌ Error generating coverage report:', error);
    process.exit(1);
  });
}
```

## Security Scanning Automation

### 🔒 Security Pipeline Integration

#### Multi-layer Security Scanning
```yaml
# .github/workflows/security.yml
name: Security Scanning

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1' # Weekly scan

jobs:
  dependency-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level high --production

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Upload Snyk results to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif

  code-scan:
    name: Static Code Analysis
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript
          queries: security-extended

      - name: Autobuild
        uses: github/codeql-action/autobuild@v2

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten

  container-scan:
    name: Container Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t rps-bot:test .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'rps-bot:test'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  secret-scan:
    name: Secret Detection
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run GitLeaks
        uses: zricethezav/gitleaks-action@master
        with:
          config-path: .gitleaks.toml

      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
```

#### Custom Security Validators
```typescript
// scripts/security-validator.ts
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface SecurityIssue {
  type: 'secret' | 'vulnerability' | 'misconfiguration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  description: string;
  recommendation: string;
}

class SecurityValidator {
  private readonly secretPatterns = [
    { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/, type: 'password' },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{16,}['"]/, type: 'api_key' },
    { pattern: /token\s*[:=]\s*['"][^'"]{20,}['"]/, type: 'token' },
    { pattern: /secret\s*[:=]\s*['"][^'"]{10,}['"]/, type: 'secret' },
    { pattern: /-----BEGIN [A-Z ]+-----/, type: 'private_key' }
  ];

  private readonly vulnerabilityPatterns = [
    { pattern: /eval\s*\(/g, type: 'code_injection', severity: 'high' as const },
    { pattern: /innerHTML\s*=/, type: 'xss', severity: 'medium' as const },
    { pattern: /document\.write\s*\(/g, type: 'xss', severity: 'medium' as const },
    { pattern: /exec\s*\(/g, type: 'command_injection', severity: 'high' as const },
    { pattern: /crypto\.createHash\s*\(\s*['"]md5['"]/, type: 'weak_crypto', severity: 'medium' as const }
  ];

  async validateProject(projectPath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    await this.scanDirectory(projectPath, issues);
    await this.validateConfigurations(projectPath, issues);
    await this.checkDependencies(projectPath, issues);
    
    return issues;
  }

  private async scanDirectory(dir: string, issues: SecurityIssue[]): Promise<void> {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
        await this.scanDirectory(fullPath, issues);
      } else if (stat.isFile() && this.shouldScanFile(item)) {
        await this.scanFile(fullPath, issues);
      }
    }
  }

  private shouldSkipDirectory(dirname: string): boolean {
    const skipDirs = ['node_modules', '.git', 'coverage', 'dist', 'build'];
    return skipDirs.includes(dirname);
  }

  private shouldScanFile(filename: string): boolean {
    const extensions = ['.ts', '.js', '.json', '.env', '.yaml', '.yml'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  private async scanFile(filePath: string, issues: SecurityIssue[]): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for secrets
      this.secretPatterns.forEach(({ pattern, type }) => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({
            type: 'secret',
            severity: 'critical',
            file: filePath,
            description: `Potential ${type} found in file`,
            recommendation: `Remove hardcoded ${type} and use environment variables`
          });
        }
      });

      // Check for vulnerabilities
      lines.forEach((line, index) => {
        this.vulnerabilityPatterns.forEach(({ pattern, type, severity }) => {
          if (pattern.test(line)) {
            issues.push({
              type: 'vulnerability',
              severity,
              file: filePath,
              line: index + 1,
              description: `Potential ${type} vulnerability`,
              recommendation: this.getRecommendationForVulnerability(type)
            });
          }
        });
      });
      
    } catch (error) {
      console.warn(`Could not scan file ${filePath}:`, error);
    }
  }

  private async validateConfigurations(projectPath: string, issues: SecurityIssue[]): Promise<void> {
    // Check package.json for security issues
    const packageJsonPath = join(projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Check for outdated dependencies (simplified check)
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          if (typeof version === 'string' && version.includes('*')) {
            issues.push({
              type: 'misconfiguration',
              severity: 'medium',
              file: packageJsonPath,
              description: `Wildcard dependency version for ${name}`,
              recommendation: 'Use specific version ranges to avoid unexpected updates'
            });
          }
        });
      }
    } catch (error) {
      console.warn('Could not validate package.json:', error);
    }

    // Check for .env files in git
    try {
      const gitignorePath = join(projectPath, '.gitignore');
      const gitignoreContent = readFileSync(gitignorePath, 'utf8');
      
      if (!gitignoreContent.includes('.env')) {
        issues.push({
          type: 'misconfiguration',
          severity: 'high',
          file: gitignorePath,
          description: '.env files not excluded from git',
          recommendation: 'Add .env* to .gitignore to prevent committing secrets'
        });
      }
    } catch (error) {
      console.warn('Could not check .gitignore:', error);
    }
  }

  private async checkDependencies(projectPath: string, issues: SecurityIssue[]): Promise<void> {
    // This would integrate with npm audit or Snyk API
    // For now, we'll do a basic check for known vulnerable packages
    const knownVulnerable = [
      'lodash@4.17.15', // Example - this would be pulled from a vulnerability database
      'yargs-parser@13.1.1'
    ];

    try {
      const packageJson = JSON.parse(
        readFileSync(join(projectPath, 'package.json'), 'utf8')
      );
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      Object.entries(allDeps).forEach(([name, version]) => {
        const depString = `${name}@${version}`;
        if (knownVulnerable.includes(depString)) {
          issues.push({
            type: 'vulnerability',
            severity: 'high',
            file: join(projectPath, 'package.json'),
            description: `Known vulnerable dependency: ${depString}`,
            recommendation: 'Update to latest secure version'
          });
        }
      });
    } catch (error) {
      console.warn('Could not check dependencies:', error);
    }
  }

  private getRecommendationForVulnerability(type: string): string {
    const recommendations: Record<string, string> = {
      code_injection: 'Avoid using eval(). Use safer alternatives like JSON.parse() for data parsing.',
      xss: 'Use proper HTML escaping. Consider using textContent instead of innerHTML.',
      command_injection: 'Validate and sanitize all input. Use spawn() with array arguments instead of exec().',
      weak_crypto: 'Use stronger hashing algorithms like SHA-256 or bcrypt for passwords.'
    };

    return recommendations[type] || 'Review this code for potential security issues.';
  }

  generateReport(issues: SecurityIssue[]): string {
    const groupedIssues = this.groupIssuesBySeverity(issues);
    
    let report = '# Security Scan Report\n\n';
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const severityIssues = groupedIssues[severity as keyof typeof groupedIssues];
      if (severityIssues.length > 0) {
        report += `## ${severity.toUpperCase()} Severity (${severityIssues.length})\n\n`;
        
        severityIssues.forEach((issue, index) => {
          report += `### ${index + 1}. ${issue.description}\n`;
          report += `- **File**: ${issue.file}${issue.line ? ` (line ${issue.line})` : ''}\n`;
          report += `- **Type**: ${issue.type}\n`;
          report += `- **Recommendation**: ${issue.recommendation}\n\n`;
        });
      }
    });

    return report;
  }

  private groupIssuesBySeverity(issues: SecurityIssue[]): Record<string, SecurityIssue[]> {
    return issues.reduce((groups, issue) => {
      const severity = issue.severity;
      groups[severity] = groups[severity] || [];
      groups[severity].push(issue);
      return groups;
    }, {} as Record<string, SecurityIssue[]>);
  }
}

// CLI usage
if (require.main === module) {
  const validator = new SecurityValidator();
  const projectPath = process.argv[2] || '.';
  
  validator.validateProject(projectPath).then(issues => {
    if (issues.length === 0) {
      console.log('✅ No security issues found!');
      process.exit(0);
    }

    console.log(`⚠️  Found ${issues.length} security issues:`);
    console.log(validator.generateReport(issues));
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    if (criticalIssues.length > 0 || highIssues.length > 0) {
      console.error(`❌ ${criticalIssues.length} critical and ${highIssues.length} high severity issues must be fixed.`);
      process.exit(1);
    }
    
    process.exit(0);
  }).catch(error => {
    console.error('❌ Error during security validation:', error);
    process.exit(1);
  });
}
```

## Performance Testing Automation

### ⚡ Automated Performance Testing

#### Artillery Integration Scripts  
```bash
#!/bin/bash
# scripts/run-performance-tests.sh

set -e

echo "🚀 Starting performance test suite..."

# Configuration
TARGET_URL=${PERFORMANCE_TARGET:-"http://localhost:3000"}
TEST_TYPE=${LOAD_TEST_TYPE:-"basic"}
RESULTS_DIR="./performance-results"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "📊 Running $TEST_TYPE performance tests against $TARGET_URL"

# Run the appropriate test configuration
case $TEST_TYPE in
  "basic")
    echo "🔹 Running basic load test..."
    artillery run test/performance/load-test.config.js \
      --environment test \
      --output "$RESULTS_DIR/basic-load-report.json"
    ;;
  "stress")
    echo "🔸 Running stress test..."
    LOAD_TEST_TYPE=stress artillery run test/performance/load-test.config.js \
      --output "$RESULTS_DIR/stress-test-report.json"
    ;;
  "spike")
    echo "🔺 Running spike test..."
    LOAD_TEST_TYPE=spike artillery run test/performance/load-test.config.js \
      --output "$RESULTS_DIR/spike-test-report.json"
    ;;
  "websocket")
    echo "🔌 Running WebSocket test..."
    LOAD_TEST_TYPE=websocket artillery run test/performance/load-test.config.js \
      --output "$RESULTS_DIR/websocket-test-report.json"
    ;;
  "database")
    echo "🗄️ Running database performance test..."
    LOAD_TEST_TYPE=database artillery run test/performance/load-test.config.js \
      --output "$RESULTS_DIR/database-test-report.json"
    ;;
  "all")
    echo "🎯 Running all performance tests..."
    for test in basic stress spike websocket database; do
      echo "Running $test test..."
      LOAD_TEST_TYPE=$test artillery run test/performance/load-test.config.js \
        --output "$RESULTS_DIR/${test}-test-report.json"
    done
    ;;
  *)
    echo "❌ Unknown test type: $TEST_TYPE"
    echo "Available types: basic, stress, spike, websocket, database, all"
    exit 1
    ;;
esac

# Generate HTML reports
echo "📈 Generating performance reports..."
for report_file in "$RESULTS_DIR"/*.json; do
  if [ -f "$report_file" ]; then
    base_name=$(basename "$report_file" .json)
    artillery report "$report_file" --output "$RESULTS_DIR/${base_name}.html"
  fi
done

# Analyze results and generate summary
echo "🔍 Analyzing performance results..."
node scripts/analyze-performance-results.js "$RESULTS_DIR"

echo "✅ Performance testing completed. Results saved to $RESULTS_DIR"
```

#### Performance Analysis Script
```typescript
// scripts/analyze-performance-results.ts
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface PerformanceMetrics {
  testType: string;
  duration: number;
  requestsCompleted: number;
  requestsPerSecond: number;
  meanResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  maxResponseTime: number;
  minResponseTime: number;
}

interface PerformanceThresholds {
  maxMeanResponseTime: number;
  maxP95ResponseTime: number;
  maxErrorRate: number;
  minRequestsPerSecond: number;
}

class PerformanceAnalyzer {
  private readonly thresholds: Record<string, PerformanceThresholds> = {
    basic: {
      maxMeanResponseTime: 200,
      maxP95ResponseTime: 500,
      maxErrorRate: 1,
      minRequestsPerSecond: 100
    },
    stress: {
      maxMeanResponseTime: 1000,
      maxP95ResponseTime: 2000,
      maxErrorRate: 5,
      minRequestsPerSecond: 50
    },
    spike: {
      maxMeanResponseTime: 2000,
      maxP95ResponseTime: 5000,
      maxErrorRate: 10,
      minRequestsPerSecond: 20
    }
  };

  analyzeResults(resultsDir: string): void {
    console.log('🔍 Analyzing performance test results...');
    
    const reportFiles = readdirSync(resultsDir).filter(file => 
      file.endsWith('-report.json')
    );

    const allMetrics: PerformanceMetrics[] = [];
    const violations: Array<{
      testType: string;
      metric: string;
      actual: number;
      threshold: number;
    }> = [];

    for (const reportFile of reportFiles) {
      const reportPath = join(resultsDir, reportFile);
      const testType = this.extractTestType(reportFile);
      
      try {
        const metrics = this.parseReport(reportPath, testType);
        allMetrics.push(metrics);
        
        const testViolations = this.checkThresholds(metrics);
        violations.push(...testViolations);
        
      } catch (error) {
        console.error(`❌ Error analyzing ${reportFile}:`, error);
      }
    }

    this.generateSummaryReport(allMetrics, violations, resultsDir);
    this.generateTrendAnalysis(allMetrics, resultsDir);
    
    if (violations.length > 0) {
      console.error(`❌ ${violations.length} performance threshold violations found`);
      process.exit(1);
    } else {
      console.log('✅ All performance tests passed thresholds');
    }
  }

  private extractTestType(filename: string): string {
    const match = filename.match(/^(\w+)-.*-report\.json$/);
    return match ? match[1] : 'unknown';
  }

  private parseReport(reportPath: string, testType: string): PerformanceMetrics {
    const reportData = JSON.parse(readFileSync(reportPath, 'utf8'));
    
    const aggregate = reportData.aggregate;
    const latency = aggregate.latency;
    
    return {
      testType,
      duration: aggregate.duration || 0,
      requestsCompleted: aggregate.counters?.['vusers.completed'] || 0,
      requestsPerSecond: aggregate.rates?.['http.request_rate'] || 0,
      meanResponseTime: latency?.mean || 0,
      p50ResponseTime: latency?.p50 || 0,
      p95ResponseTime: latency?.p95 || 0,
      p99ResponseTime: latency?.p99 || 0,
      errorRate: this.calculateErrorRate(aggregate),
      maxResponseTime: latency?.max || 0,
      minResponseTime: latency?.min || 0
    };
  }

  private calculateErrorRate(aggregate: any): number {
    const errors = aggregate.counters?.['errors.total'] || 0;
    const requests = aggregate.counters?.['http.requests'] || 0;
    return requests > 0 ? (errors / requests) * 100 : 0;
  }

  private checkThresholds(metrics: PerformanceMetrics): Array<{
    testType: string;
    metric: string;
    actual: number;
    threshold: number;
  }> {
    const violations = [];
    const thresholds = this.thresholds[metrics.testType];
    
    if (!thresholds) return violations;

    const checks = [
      {
        metric: 'Mean Response Time',
        actual: metrics.meanResponseTime,
        threshold: thresholds.maxMeanResponseTime,
        operator: '>' as const
      },
      {
        metric: 'P95 Response Time',
        actual: metrics.p95ResponseTime,
        threshold: thresholds.maxP95ResponseTime,
        operator: '>' as const
      },
      {
        metric: 'Error Rate',
        actual: metrics.errorRate,
        threshold: thresholds.maxErrorRate,
        operator: '>' as const
      },
      {
        metric: 'Requests Per Second',
        actual: metrics.requestsPerSecond,
        threshold: thresholds.minRequestsPerSecond,
        operator: '<' as const
      }
    ];

    checks.forEach(({ metric, actual, threshold, operator }) => {
      const violates = operator === '>' ? actual > threshold : actual < threshold;
      
      if (violates) {
        violations.push({
          testType: metrics.testType,
          metric,
          actual,
          threshold
        });
      }
    });

    return violations;
  }

  private generateSummaryReport(
    allMetrics: PerformanceMetrics[],
    violations: Array<{ testType: string; metric: string; actual: number; threshold: number }>,
    resultsDir: string
  ): void {
    const summary = {
      timestamp: new Date().toISOString(),
      overallStatus: violations.length === 0 ? 'PASS' : 'FAIL',
      totalViolations: violations.length,
      testResults: allMetrics,
      violations,
      summary: this.generateTextSummary(allMetrics, violations)
    };

    // Write JSON summary
    writeFileSync(
      join(resultsDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Write markdown summary
    const markdownSummary = this.generateMarkdownSummary(summary);
    writeFileSync(
      join(resultsDir, 'performance-summary.md'),
      markdownSummary
    );

    console.log('\n' + summary.summary);
  }

  private generateTextSummary(
    metrics: PerformanceMetrics[],
    violations: Array<{ testType: string; metric: string; actual: number; threshold: number }>
  ): string {
    let summary = '📊 Performance Test Summary\n';
    summary += '='.repeat(40) + '\n\n';

    metrics.forEach(metric => {
      summary += `🔹 ${metric.testType.toUpperCase()} Test:\n`;
      summary += `   Requests/sec: ${metric.requestsPerSecond.toFixed(1)}\n`;
      summary += `   Mean response: ${metric.meanResponseTime.toFixed(1)}ms\n`;
      summary += `   P95 response: ${metric.p95ResponseTime.toFixed(1)}ms\n`;
      summary += `   Error rate: ${metric.errorRate.toFixed(2)}%\n\n`;
    });

    if (violations.length > 0) {
      summary += '⚠️  THRESHOLD VIOLATIONS:\n';
      violations.forEach(v => {
        summary += `   ${v.testType}: ${v.metric} = ${v.actual} (threshold: ${v.threshold})\n`;
      });
    } else {
      summary += '✅ All performance thresholds met!\n';
    }

    return summary;
  }

  private generateMarkdownSummary(summary: any): string {
    return `
# Performance Test Summary

**Status**: ${summary.overallStatus}  
**Timestamp**: ${summary.timestamp}  
**Violations**: ${summary.totalViolations}

## Test Results

| Test Type | RPS | Mean (ms) | P95 (ms) | P99 (ms) | Error Rate |
|-----------|-----|-----------|----------|----------|------------|
${summary.testResults.map((m: PerformanceMetrics) => 
  `| ${m.testType} | ${m.requestsPerSecond.toFixed(1)} | ${m.meanResponseTime.toFixed(1)} | ${m.p95ResponseTime.toFixed(1)} | ${m.p99ResponseTime.toFixed(1)} | ${m.errorRate.toFixed(2)}% |`
).join('\n')}

${summary.violations.length > 0 ? `
## Threshold Violations

${summary.violations.map((v: any) => 
  `- **${v.testType}**: ${v.metric} = ${v.actual} (threshold: ${v.threshold})`
).join('\n')}
` : '## ✅ All thresholds passed!'}

## Recommendations

${this.generateRecommendations(summary.testResults, summary.violations)}
`;
  }

  private generateRecommendations(
    metrics: PerformanceMetrics[],
    violations: Array<{ testType: string; metric: string; actual: number; threshold: number }>
  ): string {
    const recommendations = [];

    violations.forEach(v => {
      switch (v.metric) {
        case 'Mean Response Time':
          recommendations.push('- Consider optimizing slow endpoints or adding caching');
          break;
        case 'P95 Response Time':
          recommendations.push('- Investigate outlier requests causing high latency');
          break;
        case 'Error Rate':
          recommendations.push('- Review error logs to identify and fix failing requests');
          break;
        case 'Requests Per Second':
          recommendations.push('- Consider scaling infrastructure or optimizing performance');
          break;
      }
    });

    // Add general recommendations based on metrics
    const highLatencyTests = metrics.filter(m => m.meanResponseTime > 500);
    if (highLatencyTests.length > 0) {
      recommendations.push('- Profile application to identify performance bottlenecks');
    }

    const highErrorTests = metrics.filter(m => m.errorRate > 2);
    if (highErrorTests.length > 0) {
      recommendations.push('- Implement better error handling and circuit breakers');
    }

    return recommendations.length > 0 
      ? recommendations.join('\n')
      : '- Performance looks good! Continue monitoring trends.';
  }

  private generateTrendAnalysis(metrics: PerformanceMetrics[], resultsDir: string): void {
    // This would typically compare against historical data
    // For now, we'll create a simple trend file
    const trendData = {
      timestamp: new Date().toISOString(),
      metrics: metrics.map(m => ({
        testType: m.testType,
        meanResponseTime: m.meanResponseTime,
        requestsPerSecond: m.requestsPerSecond,
        errorRate: m.errorRate
      }))
    };

    // Append to trend history file
    const trendFile = join(resultsDir, 'performance-trend.jsonl');
    const trendLine = JSON.stringify(trendData) + '\n';
    
    try {
      require('fs').appendFileSync(trendFile, trendLine);
    } catch (error) {
      console.warn('Could not write trend data:', error);
    }
  }
}

// CLI usage
if (require.main === module) {
  const resultsDir = process.argv[2];
  if (!resultsDir) {
    console.error('Usage: node analyze-performance-results.js <results-directory>');
    process.exit(1);
  }

  const analyzer = new PerformanceAnalyzer();
  analyzer.analyzeResults(resultsDir);
}
```

## Deployment Automation

### 🚀 Automated Deployment Pipeline

#### Deployment Scripts
```bash
#!/bin/bash
# scripts/deploy-staging.sh

set -e

echo "🚀 Deploying to staging environment..."

# Configuration
DOCKER_IMAGE=${DOCKER_IMAGE:-"rps-bot:latest"}
STAGING_ENV="staging"
HEALTH_CHECK_URL="${STAGING_URL}/health"
MAX_WAIT_TIME=300

echo "📦 Deploying image: $DOCKER_IMAGE"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
./scripts/pre-deployment-checks.sh

# Database migrations
echo "📊 Running database migrations..."
npm run db:migrate -- --env=$STAGING_ENV

# Deploy application
echo "🚢 Deploying application..."
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml up -d

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
start_time=$(date +%s)
while true; do
  if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
    echo "✅ Application is ready!"
    break
  fi
  
  current_time=$(date +%s)
  elapsed=$((current_time - start_time))
  
  if [ $elapsed -gt $MAX_WAIT_TIME ]; then
    echo "❌ Deployment failed: Application not ready after ${MAX_WAIT_TIME}s"
    exit 1
  fi
  
  echo "⏳ Still waiting... (${elapsed}s elapsed)"
  sleep 10
done

# Run post-deployment verification
echo "✅ Running post-deployment verification..."
npm run test:smoke -- --env=$STAGING_ENV

echo "🎉 Staging deployment completed successfully!"
```

#### Pre-deployment Checks
```typescript
// scripts/pre-deployment-checks.ts
interface DeploymentCheck {
  name: string;
  required: boolean;
  check: () => Promise<boolean>;
  errorMessage: string;
}

class PreDeploymentValidator {
  private checks: DeploymentCheck[] = [
    {
      name: 'Docker Image Exists',
      required: true,
      check: async () => this.checkDockerImage(),
      errorMessage: 'Docker image not found or not accessible'
    },
    {
      name: 'Database Connection',
      required: true,
      check: async () => this.checkDatabaseConnection(),
      errorMessage: 'Cannot connect to database'
    },
    {
      name: 'Redis Connection',
      required: true,
      check: async () => this.checkRedisConnection(),
      errorMessage: 'Cannot connect to Redis'
    },
    {
      name: 'Environment Variables',
      required: true,
      check: async () => this.checkEnvironmentVariables(),
      errorMessage: 'Required environment variables missing'
    },
    {
      name: 'External Service Connectivity',
      required: false,
      check: async () => this.checkExternalServices(),
      errorMessage: 'External services not accessible'
    },
    {
      name: 'Disk Space',
      required: true,
      check: async () => this.checkDiskSpace(),
      errorMessage: 'Insufficient disk space'
    },
    {
      name: 'Previous Deployment Status',
      required: false,
      check: async () => this.checkPreviousDeployment(),
      errorMessage: 'Previous deployment issues detected'
    }
  ];

  async runChecks(): Promise<boolean> {
    console.log('🔍 Running pre-deployment checks...\n');
    
    let allPassed = true;
    const results = [];

    for (const check of this.checks) {
      process.stdout.write(`  ${check.name}... `);
      
      try {
        const passed = await check.check();
        
        if (passed) {
          console.log('✅');
        } else {
          console.log(check.required ? '❌' : '⚠️');
          if (check.required) {
            allPassed = false;
          }
        }
        
        results.push({
          name: check.name,
          passed,
          required: check.required,
          errorMessage: passed ? null : check.errorMessage
        });
        
      } catch (error) {
        console.log(check.required ? '❌' : '⚠️');
        console.error(`    Error: ${error}`);
        
        if (check.required) {
          allPassed = false;
        }
        
        results.push({
          name: check.name,
          passed: false,
          required: check.required,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.printSummary(results);
    
    return allPassed;
  }

  private async checkDockerImage(): Promise<boolean> {
    const imageName = process.env.DOCKER_IMAGE || 'rps-bot:latest';
    
    try {
      const { execSync } = require('child_process');
      execSync(`docker inspect ${imageName}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL
      });
      
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisConnection(): Promise<boolean> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      
      await redis.ping();
      await redis.quit();
      
      return true;
    } catch {
      return false;
    }
  }

  private async checkEnvironmentVariables(): Promise<boolean> {
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'BOT_TOKEN',
      'NODE_ENV'
    ];

    return requiredVars.every(varName => {
      const value = process.env[varName];
      return value && value.trim().length > 0;
    });
  }

  private async checkExternalServices(): Promise<boolean> {
    try {
      // Check Telegram API connectivity
      const telegramApi = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getMe`;
      const response = await fetch(telegramApi);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkDiskSpace(): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('df -h /', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const dataLine = lines[1];
      const usage = dataLine.split(/\s+/)[4];
      const usagePercent = parseInt(usage.replace('%', ''));
      
      return usagePercent < 90; // Less than 90% full
    } catch {
      return false;
    }
  }

  private async checkPreviousDeployment(): Promise<boolean> {
    try {
      const healthUrl = process.env.HEALTH_CHECK_URL;
      if (!healthUrl) return true; // Skip if no health check URL
      
      const response = await fetch(healthUrl);
      return response.ok;
    } catch {
      return true; // Don't fail deployment for this check
    }
  }

  private printSummary(results: Array<{
    name: string;
    passed: boolean;
    required: boolean;
    errorMessage: string | null;
  }>): void {
    console.log('\n📋 Pre-deployment Check Summary:');
    console.log('=' .repeat(50));
    
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);
    const requiredFailed = failed.filter(r => r.required);
    
    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length} (${requiredFailed.length} required)`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Checks:');
      failed.forEach(result => {
        const icon = result.required ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.name}: ${result.errorMessage}`);
      });
    }
    
    if (requiredFailed.length === 0) {
      console.log('\n🎉 All required checks passed! Deployment can proceed.');
    } else {
      console.log('\n🚫 Required checks failed. Deployment blocked.');
    }
  }
}

// CLI usage
if (require.main === module) {
  const validator = new PreDeploymentValidator();
  
  validator.runChecks().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Pre-deployment check failed:', error);
    process.exit(1);
  });
}
```

## Monitoring and Alerting

### 📊 QA Metrics Dashboard

#### Metrics Collection
```typescript
// src/monitoring/qa-metrics.ts
export class QAMetrics {
  private static instance: QAMetrics;
  private metrics: Map<string, any> = new Map();

  static getInstance(): QAMetrics {
    if (!QAMetrics.instance) {
      QAMetrics.instance = new QAMetrics();
    }
    return QAMetrics.instance;
  }

  // Test execution metrics
  recordTestExecution(testSuite: string, testName: string, duration: number, status: 'pass' | 'fail'): void {
    const key = `test.execution.${testSuite}`;
    const existing = this.metrics.get(key) || [];
    existing.push({
      testName,
      duration,
      status,
      timestamp: new Date().toISOString()
    });
    this.metrics.set(key, existing);
  }

  // Coverage metrics
  recordCoverageMetrics(type: string, coverage: number): void {
    this.metrics.set(`coverage.${type}`, {
      percentage: coverage,
      timestamp: new Date().toISOString()
    });
  }

  // Bug metrics
  recordBugMetrics(severity: string, status: string): void {
    const key = `bugs.${severity}.${status}`;
    const count = this.metrics.get(key) || 0;
    this.metrics.set(key, count + 1);
  }

  // Performance metrics
  recordPerformanceMetrics(testType: string, metrics: any): void {
    this.metrics.set(`performance.${testType}`, {
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }

  // Deploy metrics
  recordDeploymentMetrics(environment: string, status: 'success' | 'failure', duration: number): void {
    const key = `deployment.${environment}`;
    const existing = this.metrics.get(key) || [];
    existing.push({
      status,
      duration,
      timestamp: new Date().toISOString()
    });
    this.metrics.set(key, existing);
  }

  // Export metrics for external systems
  exportMetrics(): Record<string, any> {
    const exported: Record<string, any> = {};
    this.metrics.forEach((value, key) => {
      exported[key] = value;
    });
    return exported;
  }

  // Generate summary report
  generateSummaryReport(): string {
    const metrics = this.exportMetrics();
    
    let report = '📊 QA Metrics Summary\n';
    report += '='.repeat(30) + '\n\n';

    // Test execution summary
    const testMetrics = Object.entries(metrics)
      .filter(([key]) => key.startsWith('test.execution.'));
    
    if (testMetrics.length > 0) {
      report += '🧪 Test Execution:\n';
      testMetrics.forEach(([suite, tests]: [string, any[]]) => {
        const suiteName = suite.replace('test.execution.', '');
        const passed = tests.filter(t => t.status === 'pass').length;
        const failed = tests.filter(t => t.status === 'fail').length;
        const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;
        
        report += `  ${suiteName}: ${passed}✅ ${failed}❌ (avg: ${avgDuration.toFixed(0)}ms)\n`;
      });
      report += '\n';
    }

    // Coverage summary
    const coverageMetrics = Object.entries(metrics)
      .filter(([key]) => key.startsWith('coverage.'));
    
    if (coverageMetrics.length > 0) {
      report += '📈 Coverage:\n';
      coverageMetrics.forEach(([type, data]: [string, any]) => {
        const coverageType = type.replace('coverage.', '');
        report += `  ${coverageType}: ${data.percentage}%\n`;
      });
      report += '\n';
    }

    return report;
  }
}
```

#### Alert Configuration
```yaml
# .github/workflows/qa-alerts.yml
name: QA Alerts

on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types:
      - completed

jobs:
  qa-alerts:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    
    steps:
      - name: Send Slack Alert
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#qa-alerts'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Create GitHub Issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `CI/CD Pipeline Failure - ${context.sha.substring(0, 7)}`,
              body: `
                The CI/CD pipeline has failed for commit ${context.sha}.
                
                **Workflow**: ${context.workflow}
                **Branch**: ${context.ref}
                **Author**: ${context.actor}
                
                Please investigate and fix the failing tests or deployment issues.
              `,
              labels: ['bug', 'ci-failure', 'high-priority']
            });

      - name: Send Email Alert
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          username: ${{ secrets.EMAIL_USERNAME }}
          password: ${{ secrets.EMAIL_PASSWORD }}
          subject: 'QA Alert: CI/CD Pipeline Failure'
          to: ${{ secrets.QA_TEAM_EMAIL }}
          from: ${{ secrets.EMAIL_USERNAME }}
          body: |
            The CI/CD pipeline has failed for the RPS Tournament Bot.
            
            Repository: ${{ github.repository }}
            Commit: ${{ github.sha }}
            Branch: ${{ github.ref }}
            Workflow: ${{ github.workflow }}
            
            Please check the GitHub Actions logs and address the issues immediately.
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-26  
**Next Review Date**: 2025-10-26  
**Owner**: QA Manager  
**Maintainers**: DevOps Team, QA Engineers