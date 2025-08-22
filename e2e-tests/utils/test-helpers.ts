/**
 * Test helper utilities for Vercel examples E2E tests
 * Provides common functions for test setup, assertions, and interactions
 */

export interface TestConfig {
  blogUrl: string;
  apiUrl: string;
  uploadUrl: string;
  cronUrl: string;
}

export const DEFAULT_CONFIG: TestConfig = {
  blogUrl: process.env.BLOG_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  uploadUrl: process.env.UPLOAD_URL || 'http://localhost:3000',
  cronUrl: process.env.CRON_URL || 'http://localhost:3000',
};

/**
 * Wait for a specific condition with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test+${timestamp}@example.com`,
    username: `testuser_${timestamp}`,
    title: `Test Post ${timestamp}`,
    content: `This is test content generated at ${new Date().toISOString()}`,
    filename: `test-file-${timestamp}.jpg`,
  };
}

/**
 * Validate SEO meta tags
 */
export interface SEOMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
}

/**
 * Common viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
  ultrawide: { width: 2560, height: 1440 },
};

/**
 * Performance thresholds for Core Web Vitals
 */
export const PERFORMANCE_THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms)
  CLS: 0.1,  // Cumulative Layout Shift
  TTFB: 600, // Time to First Byte (ms)
};

/**
 * Common HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Test data patterns
 */
export const TEST_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
};

/**
 * File upload utilities
 */
export const UPLOAD_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};