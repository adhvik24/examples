# End-to-End Testing Suite for Vercel Examples

This comprehensive E2E testing suite validates the functionality and integration of multiple example applications in the Vercel examples repository using Playwright.

## 🎯 Overview

The test suite covers 5 different categories of functionality across multiple example applications:

1. **Blog Functionality** - Content management, SEO, and navigation
2. **Express.js API** - REST endpoints and data handling  
3. **Image Upload** - File upload workflows and validation
4. **Cron Monitoring** - Scheduled task management
5. **Multi-App Integration** - Cross-application compatibility

## 🏗️ Test Architecture

```
e2e-tests/
├── tests/                          # Test specifications
│   ├── blog-functionality.spec.ts  # Blog application tests
│   ├── express-api.spec.ts          # API endpoint tests
│   ├── image-upload.spec.ts         # File upload tests
│   ├── cron-monitoring.spec.ts      # Cron job tests
│   ├── multi-app-integration.spec.ts # Integration tests
│   └── setup.ts                     # Test environment setup
├── utils/                           # Utility functions
│   └── test-helpers.ts              # Common test utilities
├── fixtures/                        # Test data and assets
│   ├── test-data.json              # Sample test data
│   ├── mock-responses.json         # Mock API responses
│   └── sample-image.jpg            # Test image file
├── playwright.config.ts            # Playwright configuration
├── global-setup.ts                 # Global test setup
├── global-teardown.ts              # Global test cleanup
└── package.json                    # Dependencies and scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 9.13.0+
- Running example applications on expected ports

### Installation

```bash
# Navigate to the e2e-tests directory
cd e2e-tests

# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with UI mode for debugging  
pnpm test --ui

# Run specific test file
pnpm test:blog
pnpm test:api
pnpm test:upload
pnpm test:cron
pnpm test:integration

# Run tests in headed mode (visible browser)
pnpm test:headed

# Run tests with debugging
pnpm test:debug
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Application URLs
BLOG_URL=http://localhost:3000
API_URL=http://localhost:3001
UPLOAD_URL=http://localhost:3002  
CRON_URL=http://localhost:3003

# Performance thresholds
LCP_THRESHOLD=2500
FID_THRESHOLD=100
CLS_THRESHOLD=0.1

# Test execution options
PARALLEL_WORKERS=4
TEST_TIMEOUT=120000
```

### Browser Configuration

Tests run on multiple browsers by default:
- Chromium (Chrome/Edge)
- Firefox  
- WebKit (Safari)

To run on specific browsers:
```bash
pnpm test --project=chromium
pnpm test --project=firefox  
pnpm test --project=webkit
```

## 📊 Test Categories

### 1. Blog Functionality Tests

**File:** `tests/blog-functionality.spec.ts`

**Coverage:**
- Homepage loading and performance
- Blog post listing and navigation
- Individual post pages
- SEO metadata validation
- RSS feed accessibility
- Responsive design
- Core Web Vitals measurement

**Key Scenarios:**
- ✅ Blog homepage loads within performance thresholds
- ✅ Blog posts display correctly
- ✅ Navigation between posts works
- ✅ SEO meta tags are present and valid
- ✅ Responsive design across screen sizes

### 2. Express.js API Tests  

**File:** `tests/express-api.spec.ts`

**Coverage:**
- REST endpoint validation
- Response format verification
- HTTP method handling
- Error handling
- CORS configuration
- Performance monitoring
- Concurrent request handling

**Key Scenarios:**
- ✅ `/api/` endpoint returns HTML content
- ✅ `/api/data` endpoint returns JSON
- ✅ Proper HTTP status codes
- ✅ Error handling for invalid endpoints
- ✅ CORS headers configuration

### 3. Image Upload Tests

**File:** `tests/image-upload.spec.ts`

**Coverage:**
- File upload interface
- File type validation  
- File size limitations
- Upload progress indicators
- Image preview functionality
- Mobile responsiveness
- Error handling

**Key Scenarios:**
- ✅ Upload form displays correctly
- ✅ File type validation works
- ✅ File size limits enforced
- ✅ Upload progress shown
- ✅ Mobile-friendly interface

### 4. Cron Monitoring Tests

**File:** `tests/cron-monitoring.spec.ts`

**Coverage:**
- Job listing display
- Status indicators
- Schedule information
- Manual job triggers
- Execution history
- Auto-refresh functionality
- Error state handling

**Key Scenarios:**
- ✅ Cron dashboard loads successfully
- ✅ Job list displays with status
- ✅ Schedule information visible
- ✅ Manual trigger functionality
- ✅ Execution history tracking

### 5. Multi-App Integration Tests

**File:** `tests/multi-app-integration.spec.ts`

**Coverage:**
- Cross-application availability
- Performance consistency
- Styling/theming consistency  
- API integration patterns
- Navigation between apps
- Error handling consistency
- SEO consistency

**Key Scenarios:**
- ✅ All applications accessible
- ✅ Consistent performance across apps
- ✅ Shared design patterns
- ✅ API integration standards
- ✅ Proper error handling

## 📈 Performance Testing

The test suite includes comprehensive performance monitoring:

### Core Web Vitals
- **LCP (Largest Contentful Paint)** < 2.5s
- **FID (First Input Delay)** < 100ms  
- **CLS (Cumulative Layout Shift)** < 0.1

### API Performance
- Response times < 5s for standard endpoints
- Concurrent request handling
- Error rate monitoring

### Load Testing
- Multiple browser testing
- Mobile performance validation
- Network condition simulation

## 🔍 Debugging Tests

### Local Debugging

```bash
# Run in headed mode to see browser
pnpm test:headed

# Debug specific test with DevTools
pnpm test:debug tests/blog-functionality.spec.ts

# Run single test with trace
pnpm test --trace on tests/express-api.spec.ts
```

### Visual Debugging

```bash
# Run with UI mode for visual debugging
pnpm test --ui

# Generate test report
pnpm test:report
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots of failure point
- Screen recordings of test execution
- Playwright traces for detailed debugging

Files saved to: `test-results/`

## 🤖 CI/CD Integration

### GitHub Actions

The included workflow (`.github/workflows/e2e-tests.yml`) provides:

- **Multi-browser testing** across Chromium, Firefox, WebKit
- **Parallel execution** for faster results
- **Visual regression testing** on pull requests
- **Performance testing** with threshold validation
- **Artifact collection** for debugging
- **Test reporting** with detailed results

### Running in CI

```yaml
- name: Run E2E Tests
  run: |
    cd e2e-tests
    pnpm test
  env:
    CI: true
```

## 🛠️ Extending Tests

### Adding New Tests

1. Create new `.spec.ts` file in `tests/` directory
2. Import required utilities from `utils/test-helpers.ts`
3. Use test data from `fixtures/` directory
4. Follow existing patterns for consistency

```typescript
import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG } from '../utils/test-helpers';

test.describe('New Feature Tests', () => {
  test('should validate new functionality', async ({ page }) => {
    await page.goto(DEFAULT_CONFIG.blogUrl);
    // Add test logic
  });
});
```

### Custom Utilities

Add reusable functions to `utils/test-helpers.ts`:

```typescript
export async function waitForElement(
  page: Page, 
  selector: string, 
  timeout: number = 10000
) {
  await page.waitForSelector(selector, { timeout });
}
```

### Test Data

Update `fixtures/test-data.json` with new test scenarios:

```json
{
  "newFeature": {
    "testCases": [
      {
        "id": "test-case-1",
        "data": "test data"
      }
    ]
  }
}
```

## 📋 Test Results & Reporting

### HTML Reports

```bash
# Generate and open HTML report
pnpm test:report
```

### JUnit XML

For CI integration, JUnit XML reports are generated at:
`test-results/junit.xml`

### JSON Results

Detailed JSON results available at:
`test-results/results.json`

## 🔧 Troubleshooting

### Common Issues

**Tests timing out:**
```bash
# Increase timeout in playwright.config.ts
timeout: 180000, // 3 minutes
```

**Browser installation issues:**
```bash
# Force reinstall browsers
pnpm exec playwright install --force
```

**Port conflicts:**
```bash
# Check what's running on ports
lsof -ti:3000 | xargs kill -9
```

**Flaky tests:**
```bash
# Run tests multiple times to identify flakiness
pnpm test --repeat-each=5
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=pw:api pnpm test
```

### Network Issues

For network-related problems:
```bash
# Test with slower network simulation
pnpm test --trace on --slow-mo=1000
```

## 📝 Contributing

1. **Follow existing patterns** for consistency
2. **Add comprehensive test coverage** for new features
3. **Include proper error handling** in tests
4. **Update documentation** for new test scenarios
5. **Ensure cross-browser compatibility**

### Code Style

- Use TypeScript for all test files
- Follow existing naming conventions
- Include descriptive test names
- Add comments for complex test logic
- Use async/await for all asynchronous operations

### Pull Request Checklist

- [ ] Tests pass locally on all browsers
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] Screenshots/videos verified for UI tests
- [ ] Performance thresholds met

## 📞 Support

For questions or issues with the E2E testing suite:

1. Check existing GitHub issues
2. Review test logs and screenshots
3. Run tests in debug mode
4. Create detailed issue report

---

**Happy Testing!** 🎉

This E2E testing suite ensures the Vercel examples repository maintains high quality and reliability across all example applications.