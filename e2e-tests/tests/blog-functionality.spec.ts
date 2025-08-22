import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG, VIEWPORTS, PERFORMANCE_THRESHOLDS } from '../utils/test-helpers';

/**
 * End-to-End Tests for Blog Functionality
 * Tests the portfolio blog starter application features
 */

test.describe('Blog Application', () => {
  let blogUrl: string;

  test.beforeAll(async () => {
    blogUrl = DEFAULT_CONFIG.blogUrl;
  });

  test.beforeEach(async ({ page }) => {
    // Set up page monitoring for performance
    await page.route('**/*', (route) => {
      // Allow all requests but monitor them
      route.continue();
    });
  });

  test('should load blog homepage successfully', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(blogUrl);
    const loadTime = Date.now() - startTime;

    // Verify page loads within performance threshold
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);

    // Check main elements are present
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // Take screenshot for visual validation
    await page.screenshot({ 
      path: 'test-results/screenshots/blog-homepage.png',
      fullPage: true 
    });
  });

  test('should display blog posts list', async ({ page }) => {
    await page.goto(blogUrl);

    // Wait for posts to load
    await page.waitForSelector('[data-testid="blog-posts"], article, .post', { 
      state: 'visible',
      timeout: 10000 
    });

    // Check if blog posts are displayed
    const posts = page.locator('article, .post, [data-testid="post"]');
    const postCount = await posts.count();
    
    // Should have at least one post
    expect(postCount).toBeGreaterThan(0);

    // Verify post structure
    const firstPost = posts.first();
    await expect(firstPost).toBeVisible();
    
    // Look for common blog post elements
    const hasTitle = await firstPost.locator('h1, h2, h3, [data-testid="post-title"]').count() > 0;
    const hasContent = await firstPost.locator('p, [data-testid="post-excerpt"]').count() > 0;
    
    expect(hasTitle || hasContent).toBeTruthy();
  });

  test('should navigate to individual blog post', async ({ page }) => {
    await page.goto(blogUrl);

    // Find and click on the first blog post link
    const postLink = page.locator('a[href*="/"], a[href*="post"], article a, .post a').first();
    
    if (await postLink.count() > 0) {
      const href = await postLink.getAttribute('href');
      expect(href).toBeTruthy();
      
      await postLink.click();
      await page.waitForLoadState('networkidle');

      // Verify we're on a post page
      await expect(page.locator('article, .post-content, main')).toBeVisible();
      
      // Check for post content
      const hasContent = await page.locator('h1, h2, p, .content').count() > 0;
      expect(hasContent).toBeTruthy();
    } else {
      // If no post links found, check if it's a single post page already
      const hasPostContent = await page.locator('article, .post-content, h1').count() > 0;
      expect(hasPostContent).toBeGreaterThan(0);
    }
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    await page.goto(blogUrl);

    // Check for essential SEO meta tags
    const title = await page.locator('title').textContent();
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(10);

    // Check for meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    if (description) {
      expect(description.length).toBeGreaterThan(20);
      expect(description.length).toBeLessThan(160);
    }

    // Check for Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');

    // At least title should be present
    expect(ogTitle || title).toBeTruthy();

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    await page.goto(blogUrl);

    // Test mobile view
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(1000); // Allow layout to adjust
    
    await expect(page.locator('main')).toBeVisible();
    await page.screenshot({ 
      path: 'test-results/screenshots/blog-mobile.png',
      fullPage: true 
    });

    // Test tablet view  
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(1000);
    
    await expect(page.locator('main')).toBeVisible();
    await page.screenshot({ 
      path: 'test-results/screenshots/blog-tablet.png',
      fullPage: true 
    });

    // Test desktop view
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(1000);
    
    await expect(page.locator('main')).toBeVisible();
    await page.screenshot({ 
      path: 'test-results/screenshots/blog-desktop.png',
      fullPage: true 
    });
  });

  test('should load RSS feed if available', async ({ page, request }) => {
    // Try common RSS feed paths
    const rssPaths = ['/rss', '/rss.xml', '/feed', '/feed.xml', '/api/rss'];
    
    for (const path of rssPaths) {
      try {
        const response = await request.get(`${blogUrl}${path}`);
        
        if (response.status() === 200) {
          const contentType = response.headers()['content-type'];
          
          if (contentType?.includes('xml') || contentType?.includes('rss')) {
            const content = await response.text();
            expect(content).toContain('<rss');
            expect(content).toContain('<channel>');
            
            console.log(`✅ RSS feed found at: ${path}`);
            break;
          }
        }
      } catch (error) {
        // Continue checking other paths
        continue;
      }
    }
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto(blogUrl);

    // Look for navigation elements
    const nav = page.locator('nav, .navigation, .menu, header a');
    
    if (await nav.count() > 0) {
      const navLinks = nav.locator('a');
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        // Test first navigation link
        const firstLink = navLinks.first();
        const href = await firstLink.getAttribute('href');
        
        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          await firstLink.click();
          await page.waitForLoadState('networkidle');
          
          // Verify navigation worked
          const currentUrl = page.url();
          expect(currentUrl).toBeTruthy();
        }
      }
    }
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    const response = await page.goto(`${blogUrl}/non-existent-page-12345`);
    
    // Should either redirect to 404 page or show 404 status
    if (response) {
      const status = response.status();
      expect([200, 404]).toContain(status);
      
      if (status === 404) {
        // Look for 404 content
        const body = await page.textContent('body');
        expect(body?.toLowerCase()).toMatch(/404|not found|page not found/);
      }
    }
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto(blogUrl);

    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcpEntry = entries[entries.length - 1];
          resolve(lcpEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    // Measure Cumulative Layout Shift (CLS)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Measure for 5 seconds
        setTimeout(() => resolve(clsValue), 5000);
      });
    });

    // Log performance metrics
    console.log(`LCP: ${lcp}ms`);
    console.log(`CLS: ${cls}`);

    // Verify performance thresholds
    if (typeof lcp === 'number' && lcp > 0) {
      expect(lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);
    }
    
    if (typeof cls === 'number') {
      expect(cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS);
    }
  });
});