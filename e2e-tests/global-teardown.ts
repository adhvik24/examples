import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Playwright tests
 * Handles cleanup after all tests complete
 */
async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting global teardown for Vercel examples E2E tests...');

  try {
    // Clean up temporary files if needed
    const tempDir = path.join(process.cwd(), 'test-results/temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️  Cleaned up temporary files');
    }

    // Archive test results if needed
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(resultsDir)) {
      console.log('📁 Test results preserved in:', resultsDir);
    }

    console.log('✨ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;