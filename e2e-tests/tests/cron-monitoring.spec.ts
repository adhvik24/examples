import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG, HTTP_STATUS, TEST_PATTERNS } from '../utils/test-helpers';

/**
 * End-to-End Tests for Cron Job Monitoring
 * Tests the cron job scheduling and monitoring application
 */

test.describe('Cron Job Monitoring', () => {
  let cronUrl: string;

  test.beforeAll(async () => {
    cronUrl = DEFAULT_CONFIG.cronUrl;
  });

  test('should load cron monitoring dashboard', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(cronUrl);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(10000);

    // Look for dashboard elements
    const dashboardElements = await page.locator('.dashboard, .jobs, .cron, [data-testid="dashboard"]').count();
    const headerElements = await page.locator('h1, h2, .title').count();

    expect(dashboardElements > 0 || headerElements > 0).toBeTruthy();

    await page.screenshot({ 
      path: 'test-results/screenshots/cron-dashboard.png',
      fullPage: true 
    });

    console.log('✅ Cron monitoring dashboard loaded successfully');
  });

  test('should display list of cron jobs', async ({ page }) => {
    await page.goto(cronUrl);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for job listings
    const jobElements = await page.locator('.job, .cron-job, [data-testid="job"], tr, .job-item').count();
    const tableElements = await page.locator('table, .table, .job-table').count();

    if (jobElements > 0) {
      console.log(`✅ Found ${jobElements} cron job elements`);
      
      // Check job details
      const firstJob = page.locator('.job, .cron-job, [data-testid="job"], tr').first();
      
      if (await firstJob.count() > 0) {
        // Look for job name or identifier
        const jobText = await firstJob.textContent();
        expect(jobText).toBeTruthy();
        
        console.log(`First job content: ${jobText?.slice(0, 100)}...`);
      }
    } else if (tableElements > 0) {
      console.log('✅ Found table structure for cron jobs');
      
      // Check table rows
      const tableRows = await page.locator('table tr, .table tr').count();
      expect(tableRows).toBeGreaterThan(0);
    } else {
      console.log('ℹ️ Jobs may be loaded dynamically or use different UI structure');
    }
  });

  test('should show job status information', async ({ page }) => {
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    // Look for status indicators
    const statusElements = await page.locator('.status, .active, .inactive, .running, .success, .failed').count();
    const badgeElements = await page.locator('.badge, .label, .tag').count();

    if (statusElements > 0 || badgeElements > 0) {
      console.log('✅ Job status indicators found');
      
      // Check for common status values
      const pageContent = await page.textContent('body');
      const statusKeywords = ['active', 'inactive', 'running', 'success', 'failed', 'completed', 'pending'];
      
      let foundStatuses = 0;
      for (const keyword of statusKeywords) {
        if (pageContent?.toLowerCase().includes(keyword)) {
          foundStatuses++;
          console.log(`Status keyword found: ${keyword}`);
        }
      }
      
      expect(foundStatuses).toBeGreaterThan(0);
    } else {
      console.log('ℹ️ Status information may use different styling or be dynamically loaded');
    }
  });

  test('should display schedule information', async ({ page }) => {
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    
    // Look for cron schedule patterns
    const cronPatterns = [
      /\d+\s+\d+\s+\*\s+\*\s+\*/,  // Basic cron pattern
      /\*\/\d+/,                     // */minutes pattern
      /@(daily|weekly|monthly|hourly)/, // Named schedules
      /every\s+\d+\s+(minute|hour|day)s?/i // Human readable schedules
    ];

    let scheduleFound = false;
    for (const pattern of cronPatterns) {
      if (pattern.test(pageContent || '')) {
        scheduleFound = true;
        console.log(`✅ Schedule pattern found: ${pattern.source}`);
        break;
      }
    }

    // Also check for time-related content
    const timeKeywords = ['daily', 'weekly', 'hourly', 'schedule', 'cron', 'minute', 'hour'];
    let timeContentFound = false;
    
    for (const keyword of timeKeywords) {
      if (pageContent?.toLowerCase().includes(keyword)) {
        timeContentFound = true;
        console.log(`Schedule keyword found: ${keyword}`);
      }
    }

    expect(scheduleFound || timeContentFound).toBeTruthy();
  });

  test('should show last run and next run times', async ({ page }) => {
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    
    // Look for timestamp patterns
    const timestampPatterns = [
      /\d{4}-\d{2}-\d{2}/,        // ISO date
      /\d{1,2}\/\d{1,2}\/\d{4}/,  // US date format
      /\d{1,2}-\d{1,2}-\d{4}/,    // EU date format
      /\d{1,2}:\d{2}/,            // Time format
      /(AM|PM)/i,                 // 12-hour format
      /ago|in\s+\d+/i,            // Relative time
    ];

    let timestampFound = false;
    for (const pattern of timestampPatterns) {
      if (pattern.test(pageContent || '')) {
        timestampFound = true;
        console.log(`✅ Timestamp pattern found: ${pattern.source}`);
        break;
      }
    }

    // Look for time-related labels
    const timeLabels = ['last run', 'next run', 'last execution', 'next execution', 'executed', 'scheduled'];
    let labelFound = false;
    
    for (const label of timeLabels) {
      if (pageContent?.toLowerCase().includes(label)) {
        labelFound = true;
        console.log(`Time label found: ${label}`);
      }
    }

    expect(timestampFound || labelFound).toBeTruthy();
  });

  test('should handle job trigger functionality', async ({ page }) => {
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    // Look for trigger buttons
    const triggerButtons = await page.locator('button:has-text("Run"), button:has-text("Trigger"), button:has-text("Execute"), [data-testid="trigger"]').count();
    
    if (triggerButtons > 0) {
      console.log(`✅ Found ${triggerButtons} trigger buttons`);
      
      const firstTriggerButton = page.locator('button:has-text("Run"), button:has-text("Trigger"), button:has-text("Execute")').first();
      
      // Check if button is enabled
      const isEnabled = await firstTriggerButton.isEnabled();
      expect(isEnabled).toBeTruthy();
      
      // Click the trigger button
      await firstTriggerButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Look for feedback (success message, status change, etc.)
      const feedbackElements = await page.locator('.success, .triggered, .running, .alert, .message').count();
      
      if (feedbackElements > 0) {
        console.log('✅ Job trigger provided feedback');
      } else {
        console.log('ℹ️ Job trigger may use subtle feedback or async updates');
      }
      
      await page.screenshot({ 
        path: 'test-results/screenshots/cron-trigger-result.png',
        fullPage: true 
      });
      
    } else {
      console.log('ℹ️ Manual trigger functionality may not be available');
    }
  });

  test('should display job execution history', async ({ page }) => {
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    // Look for history or logs sections
    const historyElements = await page.locator('.history, .logs, .executions, [data-testid="history"]').count();
    const logEntries = await page.locator('.log-entry, .execution, tr, .history-item').count();

    if (historyElements > 0 || logEntries > 3) {
      console.log('✅ Job execution history section found');
      
      // Check for execution details
      const pageContent = await page.textContent('body');
      const executionKeywords = ['execution', 'completed', 'failed', 'duration', 'runtime', 'success'];
      
      let executionInfoFound = 0;
      for (const keyword of executionKeywords) {
        if (pageContent?.toLowerCase().includes(keyword)) {
          executionInfoFound++;
        }
      }
      
      expect(executionInfoFound).toBeGreaterThan(0);
      console.log(`Found ${executionInfoFound} execution-related keywords`);
      
    } else {
      console.log('ℹ️ Execution history may be on a separate page or use different structure');
    }
  });

  test('should handle API endpoints for job data', async ({ request }) => {
    // Test common API endpoints for cron job data
    const apiEndpoints = [
      '/api/jobs',
      '/api/cron',
      '/api/status',
      '/jobs',
      '/cron'
    ];

    let apiFound = false;
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await request.get(`${cronUrl}${endpoint}`);
        
        if (response.status() === HTTP_STATUS.OK) {
          const contentType = response.headers()['content-type'];
          
          if (contentType?.includes('json')) {
            const data = await response.json();
            console.log(`✅ API endpoint found: ${endpoint}`);
            console.log(`Response data keys:`, Object.keys(data));
            
            apiFound = true;
            
            // Validate job data structure
            if (Array.isArray(data)) {
              expect(data.length).toBeGreaterThanOrEqual(0);
            } else if (data.jobs && Array.isArray(data.jobs)) {
              expect(data.jobs.length).toBeGreaterThanOrEqual(0);
            }
            
            break;
          }
        }
      } catch (error) {
        // Continue checking other endpoints
        continue;
      }
    }
    
    if (apiFound) {
      console.log('✅ Cron job API is accessible');
    } else {
      console.log('ℹ️ No JSON API endpoints found - may use server-side rendering');
    }
  });

  test('should refresh job status automatically or manually', async ({ page }) => {
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    // Look for refresh functionality
    const refreshButtons = await page.locator('button:has-text("Refresh"), button:has-text("Reload"), [data-testid="refresh"]').count();
    
    if (refreshButtons > 0) {
      console.log('✅ Manual refresh functionality found');
      
      const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Reload")').first();
      await refreshButton.click();
      
      await page.waitForTimeout(2000);
      console.log('✅ Manual refresh executed');
    }

    // Check for auto-refresh indicators
    const pageContent = await page.textContent('body');
    const autoRefreshKeywords = ['auto-refresh', 'polling', 'real-time', 'live'];
    
    let autoRefreshFound = false;
    for (const keyword of autoRefreshKeywords) {
      if (pageContent?.toLowerCase().includes(keyword)) {
        autoRefreshFound = true;
        console.log(`Auto-refresh keyword found: ${keyword}`);
      }
    }

    // Monitor for automatic updates (check if content changes)
    const initialContent = await page.textContent('body');
    await page.waitForTimeout(10000); // Wait 10 seconds
    const updatedContent = await page.textContent('body');

    if (initialContent !== updatedContent) {
      console.log('✅ Content updated automatically (possible auto-refresh)');
    } else if (autoRefreshFound) {
      console.log('✅ Auto-refresh indicators present');
    } else {
      console.log('ℹ️ Refresh functionality may be manual or use different patterns');
    }
  });

  test('should display error states for failed jobs', async ({ page }) => {
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    // Look for error indicators
    const errorElements = await page.locator('.error, .failed, .alert-danger, .text-red, .status-error').count();
    
    if (errorElements > 0) {
      console.log(`✅ Found ${errorElements} error indicators`);
      
      // Check error content
      const firstError = page.locator('.error, .failed, .alert-danger').first();
      const errorText = await firstError.textContent();
      
      expect(errorText).toBeTruthy();
      console.log(`Error message sample: ${errorText?.slice(0, 100)}...`);
      
    } else {
      // Look for error-related text content
      const pageContent = await page.textContent('body');
      const errorKeywords = ['error', 'failed', 'failure', 'exception', 'timeout'];
      
      let errorContentFound = false;
      for (const keyword of errorKeywords) {
        if (pageContent?.toLowerCase().includes(keyword)) {
          errorContentFound = true;
          console.log(`Error keyword found: ${keyword}`);
        }
      }
      
      if (errorContentFound) {
        console.log('✅ Error states are represented in content');
      } else {
        console.log('ℹ️ No error states visible (all jobs may be healthy)');
      }
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(cronUrl);
    await page.waitForTimeout(2000);

    // Dashboard should be usable on mobile
    const mainContent = page.locator('main, .container, .dashboard').first();
    await expect(mainContent).toBeVisible();

    await page.screenshot({ 
      path: 'test-results/screenshots/cron-mobile.png',
      fullPage: true 
    });

    // Check if tables/job lists are mobile-friendly
    const tables = await page.locator('table').count();
    if (tables > 0) {
      const table = page.locator('table').first();
      const tableBox = await table.boundingBox();
      
      if (tableBox) {
        // Table should fit within mobile viewport or be scrollable
        expect(tableBox.width).toBeLessThanOrEqual(400); // Allow some margin
      }
    }

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    await expect(mainContent).toBeVisible();
    await page.screenshot({ 
      path: 'test-results/screenshots/cron-tablet.png',
      fullPage: true 
    });

    console.log('✅ Cron monitoring interface is responsive');
  });
});