import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Setup authentication and test environment
 * This runs before other tests to prepare the testing environment
 */

const authFile = 'test-results/.auth/user.json';

setup('authenticate and prepare test environment', async ({ page, request }) => {
  console.log('🔧 Setting up test environment...');

  // Create auth directory if it doesn't exist
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Basic health check for the main applications
  const baseUrls = [
    'http://localhost:3000', // Blog
    'http://localhost:3001', // Express API
    'http://localhost:3002', // Image Upload (if running)
    'http://localhost:3003'  // Cron Monitor (if running)
  ];

  console.log('🔍 Checking application availability...');
  
  for (const url of baseUrls) {
    try {
      const response = await request.get(url, { timeout: 10000 });
      const status = response.status();
      
      if (status >= 200 && status < 400) {
        console.log(`✅ ${url} - Available (${status})`);
      } else {
        console.log(`⚠️ ${url} - Responded with ${status}`);
      }
    } catch (error) {
      console.log(`❌ ${url} - Not available or connection failed`);
    }
  }

  // Set up basic authentication state (if needed in the future)
  try {
    // For now, just create an empty auth state
    // This can be extended for OAuth, session tokens, etc.
    await page.goto('http://localhost:3000', { 
      timeout: 30000,
      waitUntil: 'domcontentloaded' 
    });
    
    // Save the storage state
    await page.context().storageState({ path: authFile });
    
    console.log('✅ Authentication state saved');
    
  } catch (error) {
    console.log('⚠️ Could not set up authentication state:', error);
    
    // Create minimal auth state file
    const minimalAuthState = {
      cookies: [],
      origins: []
    };
    
    fs.writeFileSync(authFile, JSON.stringify(minimalAuthState, null, 2));
    console.log('✅ Minimal authentication state created');
  }

  // Verify test fixtures directory exists
  const fixturesDir = path.join(process.cwd(), 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
    console.log('✅ Fixtures directory created');
  }

  // Create test data file if it doesn't exist
  const testDataFile = path.join(fixturesDir, 'generated-test-data.json');
  if (!fs.existsSync(testDataFile)) {
    const generatedTestData = {
      timestamp: new Date().toISOString(),
      testRunId: `test-${Date.now()}`,
      environment: process.env.NODE_ENV || 'test',
      apps: {
        blog: process.env.BLOG_URL || 'http://localhost:3000',
        api: process.env.API_URL || 'http://localhost:3001',
        upload: process.env.UPLOAD_URL || 'http://localhost:3002',
        cron: process.env.CRON_URL || 'http://localhost:3003'
      }
    };
    
    fs.writeFileSync(testDataFile, JSON.stringify(generatedTestData, null, 2));
    console.log('✅ Generated test data file created');
  }

  console.log('🎉 Test environment setup completed successfully!');
});