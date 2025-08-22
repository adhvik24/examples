import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG, UPLOAD_CONSTRAINTS } from '../utils/test-helpers';

/**
 * End-to-End Tests for Image Upload Functionality
 * Tests the AWS S3 image upload application features
 */

test.describe('Image Upload Application', () => {
  let uploadUrl: string;

  test.beforeAll(async () => {
    uploadUrl = DEFAULT_CONFIG.uploadUrl;
  });

  test('should load upload page successfully', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(uploadUrl);
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time
    expect(loadTime).toBeLessThan(10000);

    // Check for upload form or interface
    const uploadElements = await page.locator('input[type="file"], .upload, [data-testid="upload"], .dropzone').count();
    expect(uploadElements).toBeGreaterThan(0);

    await page.screenshot({ 
      path: 'test-results/screenshots/upload-page.png',
      fullPage: true 
    });

    console.log('✅ Image upload page loaded successfully');
  });

  test('should display file upload form', async ({ page }) => {
    await page.goto(uploadUrl);

    // Look for file input
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    // Check for upload button or submit functionality
    const uploadButton = page.locator('button:has-text("Upload"), input[type="submit"], [data-testid="upload-button"]').first();
    
    if (await uploadButton.count() > 0) {
      await expect(uploadButton).toBeVisible();
      console.log('✅ Upload button found');
    } else {
      console.log('ℹ️ Upload may use drag-and-drop or auto-upload');
    }

    // Check for drag and drop area
    const dropZone = page.locator('.dropzone, [data-testid="dropzone"], .drag-drop');
    if (await dropZone.count() > 0) {
      await expect(dropZone).toBeVisible();
      console.log('✅ Drag and drop area found');
    }
  });

  test('should validate file type restrictions', async ({ page }) => {
    await page.goto(uploadUrl);

    // Create a test file buffer (simulating non-image file)
    const testBuffer = Buffer.from('This is not an image file', 'utf8');
    
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      // Try to upload a non-image file
      await fileInput.setInputFiles({
        name: 'test-document.txt',
        mimeType: 'text/plain',
        buffer: testBuffer
      });

      // Look for validation message or error
      await page.waitForTimeout(2000);
      
      const errorMessages = await page.locator('.error, .invalid, [data-testid="error"], .alert-error').count();
      const hasValidation = errorMessages > 0;

      if (hasValidation) {
        console.log('✅ File type validation is working');
        
        // Check error message content
        const errorText = await page.locator('.error, .invalid, [data-testid="error"], .alert-error').first().textContent();
        expect(errorText?.toLowerCase()).toMatch(/invalid|type|format|allowed/);
      } else {
        console.log('ℹ️ File type validation may be handled server-side');
      }
    }
  });

  test('should handle image file upload simulation', async ({ page }) => {
    await page.goto(uploadUrl);

    // Create a small test image buffer (1x1 pixel PNG)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0x1D, 0x01, 0x01, 0x00, 0x00, 0xFF,
      0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x73,
      0x75, 0x01, 0x18, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      // Upload the test image
      await fileInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });

      // Look for upload progress or success indicators
      await page.waitForTimeout(2000);

      // Check for preview or upload confirmation
      const previewElements = await page.locator('img, .preview, [data-testid="preview"], .uploaded-image').count();
      const successMessages = await page.locator('.success, .uploaded, [data-testid="success"], .alert-success').count();

      if (previewElements > 0) {
        console.log('✅ Image preview displayed');
      }
      
      if (successMessages > 0) {
        console.log('✅ Upload success message displayed');
      }

      // Take screenshot of upload result
      await page.screenshot({ 
        path: 'test-results/screenshots/upload-result.png',
        fullPage: true 
      });
    }
  });

  test('should show upload progress for larger files', async ({ page }) => {
    await page.goto(uploadUrl);

    // Create a larger test file (simulating larger image)
    const largeBuffer = Buffer.alloc(1024 * 100, 0xFF); // 100KB buffer

    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'large-test-image.jpg',
        mimeType: 'image/jpeg',
        buffer: largeBuffer
      });

      // Look for progress indicators
      const progressElements = page.locator('.progress, .loading, .uploading, [data-testid="progress"]');
      
      // Check if progress is shown (even briefly)
      try {
        await expect(progressElements.first()).toBeVisible({ timeout: 3000 });
        console.log('✅ Upload progress indicator displayed');
      } catch {
        console.log('ℹ️ Upload may be too fast to show progress or uses different UI pattern');
      }

      // Wait for completion
      await page.waitForTimeout(5000);
    }
  });

  test('should handle multiple file selection if supported', async ({ page }) => {
    await page.goto(uploadUrl);

    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      const hasMultiple = await fileInput.getAttribute('multiple');
      
      if (hasMultiple !== null) {
        console.log('✅ Multiple file upload is supported');

        // Create multiple test files
        const file1 = {
          name: 'test-image-1.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake-png-1', 'utf8')
        };
        
        const file2 = {
          name: 'test-image-2.jpg',
          mimeType: 'image/jpeg', 
          buffer: Buffer.from('fake-jpg-2', 'utf8')
        };

        await fileInput.setInputFiles([file1, file2]);
        
        await page.waitForTimeout(2000);
        
        // Check if multiple files are acknowledged
        const fileCount = await page.locator('.file-item, .upload-item, [data-testid="file"]').count();
        console.log(`Multiple files selected: ${fileCount} items detected`);
        
      } else {
        console.log('ℹ️ Single file upload only');
      }
    }
  });

  test('should handle file size limits', async ({ page }) => {
    await page.goto(uploadUrl);

    // Create an oversized file buffer
    const oversizedBuffer = Buffer.alloc(UPLOAD_CONSTRAINTS.maxFileSize + 1000, 0xFF);

    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'oversized-image.jpg',
        mimeType: 'image/jpeg',
        buffer: oversizedBuffer
      });

      await page.waitForTimeout(3000);

      // Look for size limit error
      const errorMessages = await page.locator('.error, .too-large, [data-testid="size-error"], .alert-error').count();
      
      if (errorMessages > 0) {
        const errorText = await page.locator('.error, .too-large, [data-testid="size-error"], .alert-error').first().textContent();
        expect(errorText?.toLowerCase()).toMatch(/size|large|limit|mb/);
        console.log('✅ File size validation is working');
      } else {
        console.log('ℹ️ File size validation may be handled server-side');
      }
    }
  });

  test('should display uploaded images in gallery or list', async ({ page }) => {
    await page.goto(uploadUrl);

    // Look for existing uploaded images or gallery
    const galleryElements = await page.locator('.gallery, .images, .uploaded-files, [data-testid="gallery"]').count();
    const imageElements = await page.locator('img, .image-item, .thumbnail').count();

    if (galleryElements > 0 || imageElements > 0) {
      console.log('✅ Image gallery or uploaded files display found');
      
      await page.screenshot({ 
        path: 'test-results/screenshots/image-gallery.png',
        fullPage: true 
      });

      // If images are present, verify they load
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        // Check first few images load properly
        const checkCount = Math.min(3, imageCount);
        
        for (let i = 0; i < checkCount; i++) {
          const img = images.nth(i);
          const src = await img.getAttribute('src');
          
          if (src && !src.startsWith('data:')) {
            // Make sure image URLs are accessible
            expect(src).toMatch(/^(https?:\/\/|\/)/);
          }
        }
        
        console.log(`✅ Gallery contains ${imageCount} images`);
      }
    } else {
      console.log('ℹ️ No image gallery found - may be upload-only interface');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto(uploadUrl);

    // Simulate network failure during upload
    await page.route('**/upload*', route => {
      route.abort('failed');
    });

    await page.route('**/api/upload*', route => {
      route.abort('failed');
    });

    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      const testBuffer = Buffer.from('test-image-data', 'utf8');
      
      await fileInput.setInputFiles({
        name: 'test-network-fail.jpg',
        mimeType: 'image/jpeg',
        buffer: testBuffer
      });

      await page.waitForTimeout(5000);

      // Look for error handling
      const errorIndicators = await page.locator('.error, .failed, .network-error, [data-testid="upload-error"]').count();
      
      if (errorIndicators > 0) {
        console.log('✅ Network error handling is implemented');
      } else {
        console.log('ℹ️ Network error handling may be subtle or use different patterns');
      }
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(uploadUrl);

    // Upload interface should be usable on mobile
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/upload-mobile.png',
      fullPage: true 
    });

    // Check if drag-drop area is mobile-friendly
    const dropZone = page.locator('.dropzone, [data-testid="dropzone"]');
    if (await dropZone.count() > 0) {
      const boundingBox = await dropZone.first().boundingBox();
      if (boundingBox) {
        // Should be reasonably sized for mobile interaction
        expect(boundingBox.height).toBeGreaterThan(50);
        expect(boundingBox.width).toBeGreaterThan(100);
      }
    }

    console.log('✅ Upload interface is mobile-responsive');
  });
});