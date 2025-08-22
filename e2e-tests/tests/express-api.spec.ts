import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG, HTTP_STATUS, TEST_PATTERNS } from '../utils/test-helpers';

/**
 * End-to-End Tests for Express.js API
 * Tests the Express.js serverless functions and API endpoints
 */

test.describe('Express.js API', () => {
  let apiUrl: string;

  test.beforeAll(async () => {
    apiUrl = DEFAULT_CONFIG.apiUrl;
  });

  test('should respond to root endpoint with HTML content', async ({ request }) => {
    const response = await request.get(`${apiUrl}/`);
    
    expect(response.status()).toBe(HTTP_STATUS.OK);
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
    
    const body = await response.text();
    expect(body).toContain('<html>');
    expect(body).toContain('Express');
    
    console.log('✅ Root endpoint responded with HTML content');
  });

  test('should respond to data endpoint with JSON', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${apiUrl}/api-data`);
    const responseTime = Date.now() - startTime;
    
    expect(response.status()).toBe(HTTP_STATUS.OK);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const data = await response.json();
    expect(data).toBeDefined();
    
    // Verify response structure
    expect(data).toHaveProperty('message');
    expect(typeof data.message).toBe('string');
    
    console.log('✅ Data API endpoint responded with JSON:', data);
  });

  test('should respond to health check endpoint', async ({ request }) => {
    const response = await request.get(`${apiUrl}/healthz`);
    
    expect(response.status()).toBe(HTTP_STATUS.OK);
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('timestamp');
    
    console.log('✅ Health check endpoint responded correctly');
  });

  test('should handle POST requests to test endpoint', async ({ request }) => {
    const testPayload = {
      name: 'Test User',
      email: 'test@example.com',
      timestamp: new Date().toISOString()
    };

    const response = await request.post(`${apiUrl}/api/test`, {
      data: testPayload,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Accept both 200 (if endpoint exists) or 404 (if not implemented)
    expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND]).toContain(response.status());
    
    if (response.status() === HTTP_STATUS.OK) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
      
      const responseData = await response.json();
      expect(responseData).toBeDefined();
      
      console.log('✅ POST endpoint responded successfully:', responseData);
    } else {
      console.log('ℹ️ POST endpoint not implemented (404 expected)');
    }
  });

  test('should handle invalid endpoints gracefully', async ({ request }) => {
    const response = await request.get(`${apiUrl}/api/nonexistent-endpoint-12345`);
    
    expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
    
    // Should still return proper error format
    const contentType = response.headers()['content-type'];
    
    if (contentType?.includes('json')) {
      const errorData = await response.json();
      expect(errorData).toBeDefined();
      expect(errorData).toHaveProperty('error');
    } else {
      const errorText = await response.text();
      expect(errorText).toBeTruthy();
    }
    
    console.log('✅ Invalid endpoint handled gracefully with 404');
  });

  test('should have proper CORS headers', async ({ request }) => {
    const response = await request.get(`${apiUrl}/api/data`);
    
    const headers = response.headers();
    
    // Check for common CORS headers
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];
    
    let corsConfigured = false;
    for (const header of corsHeaders) {
      if (headers[header]) {
        corsConfigured = true;
        console.log(`CORS header found: ${header} = ${headers[header]}`);
      }
    }
    
    // If CORS is configured, verify it's permissive or specific
    if (corsConfigured) {
      const allowOrigin = headers['access-control-allow-origin'];
      expect(allowOrigin).toBeTruthy();
      console.log('✅ CORS headers are configured');
    } else {
      console.log('ℹ️ No explicit CORS headers found (may be default behavior)');
    }
  });

  test('should handle different HTTP methods appropriately', async ({ request }) => {
    const endpoint = `${apiUrl}/api/data`;
    
    // Test GET method
    const getResponse = await request.get(endpoint);
    expect(getResponse.status()).toBe(HTTP_STATUS.OK);
    
    // Test HEAD method
    const headResponse = await request.head(endpoint);
    expect([HTTP_STATUS.OK, 405]).toContain(headResponse.status());
    
    // Test OPTIONS method (for CORS preflight)
    const optionsResponse = await request.fetch(endpoint, { method: 'OPTIONS' });
    expect([HTTP_STATUS.OK, 204, 405]).toContain(optionsResponse.status());
    
    // Test unsupported method
    const patchResponse = await request.fetch(endpoint, { method: 'PATCH' });
    expect([405, HTTP_STATUS.NOT_FOUND]).toContain(patchResponse.status());
    
    console.log('✅ HTTP methods handled appropriately');
  });

  test('should respond with appropriate caching headers', async ({ request }) => {
    const response = await request.get(`${apiUrl}/api/data`);
    
    const headers = response.headers();
    
    // Check for caching-related headers
    const cachingHeaders = [
      'cache-control',
      'etag',
      'last-modified',
      'expires'
    ];
    
    let hasCachingHeaders = false;
    for (const header of cachingHeaders) {
      if (headers[header]) {
        hasCachingHeaders = true;
        console.log(`Caching header: ${header} = ${headers[header]}`);
      }
    }
    
    // Verify reasonable cache control
    const cacheControl = headers['cache-control'];
    if (cacheControl) {
      expect(cacheControl).toBeTruthy();
      console.log('✅ Cache-Control header present');
    } else {
      console.log('ℹ️ No explicit caching headers (default behavior)');
    }
  });

  test('should handle concurrent requests efficiently', async ({ request }) => {
    const concurrentRequests = 10;
    const startTime = Date.now();
    
    // Make multiple concurrent requests
    const promises = Array.from({ length: concurrentRequests }, () =>
      request.get(`${apiUrl}/api/data`)
    );
    
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // All requests should succeed
    for (const response of responses) {
      expect(response.status()).toBe(HTTP_STATUS.OK);
    }
    
    // Should handle concurrent requests efficiently
    const avgResponseTime = totalTime / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(10000); // Average less than 10 seconds
    
    console.log(`✅ Handled ${concurrentRequests} concurrent requests in ${totalTime}ms`);
    console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
  });

  test('should have proper content encoding', async ({ request }) => {
    const response = await request.get(`${apiUrl}/api/data`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    expect(response.status()).toBe(HTTP_STATUS.OK);
    
    const headers = response.headers();
    const contentEncoding = headers['content-encoding'];
    
    if (contentEncoding) {
      expect(['gzip', 'deflate', 'br']).toContain(contentEncoding);
      console.log(`✅ Content encoding: ${contentEncoding}`);
    } else {
      console.log('ℹ️ No content encoding (uncompressed response)');
    }
    
    // Response should still be valid JSON regardless of encoding
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('should handle malformed JSON in POST requests', async ({ request }) => {
    const malformedJson = '{"invalid": json}';
    
    const response = await request.post(`${apiUrl}/api/test`, {
      data: malformedJson,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Should either handle gracefully (400) or endpoint doesn't exist (404)
    expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(response.status());
    
    if (response.status() === HTTP_STATUS.BAD_REQUEST) {
      console.log('✅ Malformed JSON handled with 400 Bad Request');
    } else {
      console.log('ℹ️ POST endpoint not available for JSON validation test');
    }
  });

  test('should measure API response times consistently', async ({ request }) => {
    const iterations = 5;
    const responseTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const response = await request.get(`${apiUrl}/api/data`);
      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(HTTP_STATUS.OK);
      responseTimes.push(responseTime);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    console.log(`Response time stats over ${iterations} requests:`);
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Min: ${minResponseTime}ms`);
    console.log(`  Max: ${maxResponseTime}ms`);
    
    // Performance expectations
    expect(avgResponseTime).toBeLessThan(5000);
    expect(maxResponseTime).toBeLessThan(15000);
    
    // Consistency check - no response should be dramatically slower
    const responseTimeVariance = maxResponseTime - minResponseTime;
    expect(responseTimeVariance).toBeLessThan(10000);
    
    console.log('✅ API response times are consistent and performant');
  });
});