import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for Playwright tests
 * Handles authentication, test data preparation, and environment setup
 */
async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting global setup for Vercel examples E2E tests...');

  // Create necessary directories
  const authDir = path.join(process.cwd(), 'test-results/.auth');
  const fixturesDir = path.join(process.cwd(), 'fixtures');
  
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Perform any authentication if needed (placeholder for future auth requirements)
    console.log('⚡ Setting up authentication state...');
    
    // For now, create a basic auth state (can be extended for OAuth, etc.)
    await page.context().storageState({ path: path.join(authDir, 'user.json') });
    
    // Verify that example applications are accessible
    console.log('🔍 Verifying application availability...');
    
    // Check blog application
    try {
      await page.goto('http://localhost:3000', { timeout: 30000 });
      console.log('✅ Blog application is accessible');
    } catch (error) {
      console.warn('⚠️  Blog application may not be running on port 3000');
    }
    
    // Check Express API
    try {
      await page.goto('http://localhost:3001', { timeout: 30000 });
      console.log('✅ Express API is accessible');
    } catch (error) {
      console.warn('⚠️  Express API may not be running on port 3001');
    }

    console.log('✨ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;