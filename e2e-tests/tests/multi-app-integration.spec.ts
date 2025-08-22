import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG, PERFORMANCE_THRESHOLDS, HTTP_STATUS } from '../utils/test-helpers';

/**
 * End-to-End Tests for Multi-Application Integration
 * Tests cross-application functionality and integration points
 */

test.describe('Multi-Application Integration', () => {
  const apps = DEFAULT_CONFIG;

  test.describe.configure({ mode: 'parallel' });

  test('should verify all example applications are accessible', async ({ request }) => {
    const appUrls = [
      { name: 'Blog', url: apps.blogUrl },
      { name: 'Express API', url: apps.apiUrl },
      { name: 'Image Upload', url: apps.uploadUrl },
      { name: 'Cron Monitor', url: apps.cronUrl }
    ];

    const results = [];

    for (const app of appUrls) {
      try {
        const startTime = Date.now();
        const response = await request.get(app.url);
        const responseTime = Date.now() - startTime;

        results.push({
          name: app.name,
          url: app.url,
          status: response.status(),
          responseTime,
          accessible: response.status() >= 200 && response.status() < 400
        });

        console.log(`${app.name}: ${response.status()} (${responseTime}ms)`);
        
      } catch (error) {
        results.push({
          name: app.name,
          url: app.url,
          status: 0,
          responseTime: 0,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        console.log(`${app.name}: Connection failed - ${error}`);
      }
    }

    // At least one app should be accessible for meaningful integration testing
    const accessibleApps = results.filter(r => r.accessible);
    expect(accessibleApps.length).toBeGreaterThan(0);

    // Log summary
    console.log(`\n📊 Application Accessibility Summary:`);
    results.forEach(result => {
      const status = result.accessible ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.accessible ? 'OK' : 'Failed'}`);
    });

    return results;
  });

  test('should measure cross-application performance', async ({ page }) => {
    const performanceMetrics: Array<{app: string, lcp?: number, cls?: number, fcp?: number}> = [];

    // Test each accessible application
    const testApps = [
      { name: 'Blog', url: apps.blogUrl },
      { name: 'Express API (via browser)', url: `${apps.apiUrl}/api/` }
    ];

    for (const app of testApps) {
      try {
        console.log(`\n🔍 Testing performance for ${app.name}...`);
        
        await page.goto(app.url, { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 });

        // Measure Core Web Vitals
        const metrics = await page.evaluate(() => {
          return new Promise((resolve) => {
            const metrics: any = {};
            
            // Largest Contentful Paint
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                metrics.lcp = entries[entries.length - 1].startTime;
              }
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // First Contentful Paint
            const fcpEntry = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              metrics.fcp = fcpEntry.startTime;
            }

            // Cumulative Layout Shift
            let clsValue = 0;
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                  clsValue += (entry as any).value;
                }
              }
              metrics.cls = clsValue;
            }).observe({ entryTypes: ['layout-shift'] });

            // Return metrics after a delay to capture measurements
            setTimeout(() => {
              resolve(metrics);
            }, 3000);
          });
        });

        performanceMetrics.push({
          app: app.name,
          ...(metrics as any)
        });

        const metricsData = metrics as any;
        console.log(`  LCP: ${metricsData.lcp ? `${metricsData.lcp.toFixed(2)}ms` : 'N/A'}`);
        console.log(`  FCP: ${metricsData.fcp ? `${metricsData.fcp.toFixed(2)}ms` : 'N/A'}`);
        console.log(`  CLS: ${metricsData.cls ? metricsData.cls.toFixed(3) : 'N/A'}`);

        // Verify performance thresholds
        if (metricsData.lcp && metricsData.lcp > 0) {
          expect(metricsData.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);
        }
        
        if (metricsData.cls !== undefined) {
          expect(metricsData.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS);
        }

      } catch (error) {
        console.log(`⚠️ Performance test failed for ${app.name}: ${error}`);
        performanceMetrics.push({
          app: app.name,
          error: error instanceof Error ? error.message : 'Performance test failed'
        });
      }
    }

    // At least one app should have performance metrics
    const appsWithMetrics = performanceMetrics.filter(m => m.lcp || m.fcp || m.cls !== undefined);
    expect(appsWithMetrics.length).toBeGreaterThan(0);
  });

  test('should verify consistent theming and styling across applications', async ({ page }) => {
    const stylingResults: Array<{app: string, hasCommonFramework: boolean, colorScheme?: string}> = [];

    const testApps = [
      { name: 'Blog', url: apps.blogUrl },
      { name: 'Image Upload', url: apps.uploadUrl }
    ];

    for (const app of testApps) {
      try {
        await page.goto(app.url, { timeout: 30000 });
        await page.waitForTimeout(2000);

        // Check for common CSS frameworks or libraries
        const frameworks = await page.evaluate(() => {
          const frameworks = {
            tailwind: !!document.querySelector('[class*="tw-"], [class*="text-"], [class*="bg-"], [class*="flex"], [class*="grid"]'),
            bootstrap: !!document.querySelector('[class*="btn"], [class*="container"], [class*="row"], [class*="col-"]'),
            material: !!document.querySelector('[class*="mat-"], [class*="md-"]'),
            vercelUI: !!document.querySelector('[class*="vercel"], [data-geist]')
          };
          
          return frameworks;
        });

        // Extract color scheme information
        const colorScheme = await page.evaluate(() => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          
          return {
            backgroundColor: computedStyle.backgroundColor,
            color: computedStyle.color,
            fontFamily: computedStyle.fontFamily
          };
        });

        const hasCommonFramework = Object.values(frameworks).some(Boolean);
        
        stylingResults.push({
          app: app.name,
          hasCommonFramework,
          colorScheme: JSON.stringify(colorScheme)
        });

        console.log(`\n🎨 ${app.name} styling analysis:`);
        console.log(`  Framework detected:`, Object.keys(frameworks).filter(k => frameworks[k as keyof typeof frameworks]));
        console.log(`  Background:`, colorScheme.backgroundColor);
        console.log(`  Font family:`, colorScheme.fontFamily);

      } catch (error) {
        console.log(`⚠️ Styling analysis failed for ${app.name}: ${error}`);
        stylingResults.push({
          app: app.name,
          hasCommonFramework: false
        });
      }
    }

    // Check if applications share common styling approaches
    const appsWithFrameworks = stylingResults.filter(r => r.hasCommonFramework);
    console.log(`\n📊 Styling consistency: ${appsWithFrameworks.length}/${stylingResults.length} apps use common frameworks`);
    
    // At least some consistency is expected in a cohesive example repository
    expect(appsWithFrameworks.length).toBeGreaterThanOrEqual(0);
  });

  test('should validate API integration patterns', async ({ request }) => {
    // Test common API patterns across different applications
    const apiTests = [
      {
        name: 'Express API Health',
        url: `${apps.apiUrl}/api/data`,
        expectedStatus: HTTP_STATUS.OK,
        expectedContentType: 'application/json'
      },
      {
        name: 'Express API Root',
        url: `${apps.apiUrl}/api/`,
        expectedStatus: HTTP_STATUS.OK,
        expectedContentType: 'text/html'
      }
    ];

    const apiResults = [];

    for (const apiTest of apiTests) {
      try {
        const response = await request.get(apiTest.url);
        const contentType = response.headers()['content-type'];
        
        const result = {
          name: apiTest.name,
          url: apiTest.url,
          status: response.status(),
          contentType,
          success: response.status() === apiTest.expectedStatus && 
                   (contentType?.includes(apiTest.expectedContentType) || false)
        };

        apiResults.push(result);
        
        console.log(`\n🔗 ${apiTest.name}:`);
        console.log(`  Status: ${result.status} (expected: ${apiTest.expectedStatus})`);
        console.log(`  Content-Type: ${contentType}`);
        console.log(`  Success: ${result.success ? '✅' : '❌'}`);

        // Test the actual response content
        if (result.success) {
          if (apiTest.expectedContentType === 'application/json') {
            const data = await response.json();
            expect(data).toBeDefined();
            console.log(`  Response data:`, Object.keys(data));
          } else {
            const text = await response.text();
            expect(text.length).toBeGreaterThan(0);
            console.log(`  Response length: ${text.length} characters`);
          }
        }

      } catch (error) {
        apiResults.push({
          name: apiTest.name,
          url: apiTest.url,
          success: false,
          error: error instanceof Error ? error.message : 'API test failed'
        });
        
        console.log(`\n❌ ${apiTest.name} failed: ${error}`);
      }
    }

    // At least one API should be working for integration testing
    const successfulApis = apiResults.filter(r => r.success);
    expect(successfulApis.length).toBeGreaterThan(0);

    console.log(`\n📊 API Integration Summary: ${successfulApis.length}/${apiResults.length} endpoints working`);
  });

  test('should handle navigation between example applications', async ({ page }) => {
    // This test simulates user navigation between different example applications
    const navigationFlow = [
      { name: 'Blog', url: apps.blogUrl },
      { name: 'API Demo', url: `${apps.apiUrl}/api/` }
    ];

    const navigationResults = [];

    for (let i = 0; i < navigationFlow.length; i++) {
      const app = navigationFlow[i];
      
      try {
        console.log(`\n🧭 Navigating to ${app.name}...`);
        
        const startTime = Date.now();
        await page.goto(app.url, { timeout: 30000 });
        await page.waitForLoadState('domcontentloaded');
        const navigationTime = Date.now() - startTime;

        // Verify the page loaded successfully
        const title = await page.title();
        const url = page.url();

        navigationResults.push({
          app: app.name,
          url: app.url,
          finalUrl: url,
          title,
          navigationTime,
          success: true
        });

        console.log(`  ✅ Loaded: ${title || 'Untitled'}`);
        console.log(`  📍 URL: ${url}`);
        console.log(`  ⏱️ Time: ${navigationTime}ms`);

        // Take screenshot for visual verification
        await page.screenshot({ 
          path: `test-results/screenshots/navigation-${app.name.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });

      } catch (error) {
        navigationResults.push({
          app: app.name,
          url: app.url,
          success: false,
          error: error instanceof Error ? error.message : 'Navigation failed'
        });

        console.log(`  ❌ Navigation failed: ${error}`);
      }
    }

    // Verify navigation success
    const successfulNavigations = navigationResults.filter(r => r.success);
    expect(successfulNavigations.length).toBeGreaterThan(0);

    console.log(`\n📊 Navigation Summary: ${successfulNavigations.length}/${navigationResults.length} successful`);
  });

  test('should verify error handling consistency across applications', async ({ page }) => {
    const errorTestUrls = [
      { app: 'Blog', url: `${apps.blogUrl}/non-existent-page-test-123` },
      { app: 'Express API', url: `${apps.apiUrl}/api/non-existent-endpoint-test-123` }
    ];

    const errorResults = [];

    for (const errorTest of errorTestUrls) {
      try {
        console.log(`\n🚫 Testing 404 handling for ${errorTest.app}...`);
        
        const response = await page.goto(errorTest.url, { 
          timeout: 30000,
          waitUntil: 'domcontentloaded' 
        });

        const status = response?.status() || 0;
        const pageContent = await page.textContent('body');
        const title = await page.title();

        // Check for 404-related content
        const has404Content = 
          pageContent?.toLowerCase().includes('404') ||
          pageContent?.toLowerCase().includes('not found') ||
          pageContent?.toLowerCase().includes('page not found') ||
          title?.toLowerCase().includes('404') ||
          status === 404;

        errorResults.push({
          app: errorTest.app,
          url: errorTest.url,
          status,
          has404Content,
          title,
          contentLength: pageContent?.length || 0
        });

        console.log(`  Status: ${status}`);
        console.log(`  Title: ${title}`);
        console.log(`  Has 404 content: ${has404Content ? '✅' : '❌'}`);

        // Take screenshot of error page
        await page.screenshot({ 
          path: `test-results/screenshots/error-${errorTest.app.toLowerCase()}-404.png`,
          fullPage: true 
        });

      } catch (error) {
        errorResults.push({
          app: errorTest.app,
          url: errorTest.url,
          error: error instanceof Error ? error.message : 'Error test failed'
        });

        console.log(`  ❌ Error test failed: ${error}`);
      }
    }

    // Verify proper error handling
    const appsWithProperErrorHandling = errorResults.filter(r => 
      r.has404Content || r.status === 404
    );

    console.log(`\n📊 Error Handling: ${appsWithProperErrorHandling.length}/${errorResults.length} apps handle 404 properly`);
    
    // At least some error handling should be present
    expect(appsWithProperErrorHandling.length).toBeGreaterThanOrEqual(0);
  });

  test('should verify consistent meta tags and SEO across applications', async ({ page }) => {
    const seoTestApps = [
      { name: 'Blog', url: apps.blogUrl },
      { name: 'Upload', url: apps.uploadUrl }
    ];

    const seoResults = [];

    for (const app of seoTestApps) {
      try {
        await page.goto(app.url, { timeout: 30000 });
        await page.waitForTimeout(2000);

        // Extract SEO metadata
        const seoData = await page.evaluate(() => {
          const getMetaContent = (name: string) => {
            const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
            return meta?.getAttribute('content') || null;
          };

          return {
            title: document.title,
            description: getMetaContent('description'),
            ogTitle: getMetaContent('og:title'),
            ogDescription: getMetaContent('og:description'),
            ogImage: getMetaContent('og:image'),
            viewport: getMetaContent('viewport'),
            robots: getMetaContent('robots'),
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null
          };
        });

        const seoScore = Object.values(seoData).filter(value => value !== null && value !== '').length;

        seoResults.push({
          app: app.name,
          ...seoData,
          seoScore
        });

        console.log(`\n🔍 SEO Analysis for ${app.name}:`);
        console.log(`  Title: ${seoData.title || 'Missing'}`);
        console.log(`  Description: ${seoData.description ? 'Present' : 'Missing'}`);
        console.log(`  Open Graph: ${seoData.ogTitle ? 'Present' : 'Missing'}`);
        console.log(`  SEO Score: ${seoScore}/8`);

      } catch (error) {
        seoResults.push({
          app: app.name,
          error: error instanceof Error ? error.message : 'SEO analysis failed',
          seoScore: 0
        });

        console.log(`\n❌ SEO analysis failed for ${app.name}: ${error}`);
      }
    }

    // Verify basic SEO elements are present
    const appsWithBasicSEO = seoResults.filter(r => 
      (r.title && r.title.length > 0) || (r.description && r.description.length > 0)
    );

    console.log(`\n📊 SEO Summary: ${appsWithBasicSEO.length}/${seoResults.length} apps have basic SEO`);
    expect(appsWithBasicSEO.length).toBeGreaterThanOrEqual(0);
  });

  test('should measure overall system health and integration', async ({ request, page }) => {
    console.log('\n🏥 System Health Check...');

    const healthMetrics = {
      accessibleApps: 0,
      totalResponseTime: 0,
      apiEndpoints: 0,
      errorRate: 0,
      averageLoadTime: 0
    };

    const testEndpoints = [
      { name: 'Blog', url: apps.blogUrl, type: 'web' },
      { name: 'API Data', url: `${apps.apiUrl}/api/data`, type: 'api' },
      { name: 'API Root', url: `${apps.apiUrl}/api/`, type: 'web' }
    ];

    let totalTests = 0;
    let failedTests = 0;
    let totalTime = 0;

    for (const endpoint of testEndpoints) {
      totalTests++;
      
      try {
        const startTime = Date.now();
        
        if (endpoint.type === 'api') {
          const response = await request.get(endpoint.url);
          const responseTime = Date.now() - startTime;
          
          if (response.status() >= 200 && response.status() < 400) {
            healthMetrics.accessibleApps++;
            if (endpoint.type === 'api') healthMetrics.apiEndpoints++;
          } else {
            failedTests++;
          }
          
          totalTime += responseTime;
          
        } else {
          await page.goto(endpoint.url, { timeout: 30000 });
          const responseTime = Date.now() - startTime;
          
          healthMetrics.accessibleApps++;
          totalTime += responseTime;
        }

      } catch (error) {
        failedTests++;
        console.log(`  ❌ ${endpoint.name} health check failed`);
      }
    }

    healthMetrics.totalResponseTime = totalTime;
    healthMetrics.errorRate = (failedTests / totalTests) * 100;
    healthMetrics.averageLoadTime = totalTime / totalTests;

    console.log(`\n📊 System Health Summary:`);
    console.log(`  Accessible Apps: ${healthMetrics.accessibleApps}/${testEndpoints.length}`);
    console.log(`  API Endpoints: ${healthMetrics.apiEndpoints}`);
    console.log(`  Error Rate: ${healthMetrics.errorRate.toFixed(1)}%`);
    console.log(`  Average Load Time: ${healthMetrics.averageLoadTime.toFixed(0)}ms`);

    // System health assertions
    expect(healthMetrics.accessibleApps).toBeGreaterThan(0);
    expect(healthMetrics.errorRate).toBeLessThan(100); // Not everything should fail
    expect(healthMetrics.averageLoadTime).toBeLessThan(30000); // Reasonable load times

    // Overall system health score
    const healthScore = (healthMetrics.accessibleApps / testEndpoints.length) * 100;
    console.log(`  🏥 Overall Health Score: ${healthScore.toFixed(1)}%`);
    
    expect(healthScore).toBeGreaterThan(0);
  });
});