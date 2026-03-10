import { test, expect } from '@playwright/test';
import { chromium, Browser, Page } from 'playwright';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'https://singglebee.com';
const TEST_TIMEOUT = 30000; // 30 seconds per test
const RETRY_ATTEMPTS = 3;

// Test data
const TEST_USER = {
  email: 'test-user@singglebee.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '9876543210',
  address: {
    street: '123 Test Street',
    landmark: 'Near Test Landmark',
    city: 'Test City',
    state: 'Tamil Nadu',
    zipCode: '600001',
    country: 'India'
  }
};

const TEST_PRODUCT = {
  name: 'Premium Tamil Poetry Collection',
  quantity: 2
};

// Metrics collection
interface TestMetrics {
  testName: string;
  duration: number;
  success: boolean;
  error?: string;
  performanceMetrics?: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    timeToInteractive: number;
  };
}

const metrics: TestMetrics[] = [];

// Helper functions
async function measurePerformance(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
    const lcp = performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0;
    const tti = navigation.domInteractive - navigation.navigationStart;
    
    return {
      firstContentfulPaint: Math.round(fcp),
      largestContentfulPaint: Math.round(lcp),
      timeToInteractive: Math.round(tti)
    };
  });
}

async function retryTest(testFn: () => Promise<void>, testName: string, maxAttempts: number = RETRY_ATTEMPTS) {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;
      
      metrics.push({
        testName,
        duration,
        success: true
      });
      
      console.log(`✅ ${testName} - Attempt ${attempt}/${maxAttempts} - ${duration}ms`);
      return;
    } catch (error) {
      lastError = error as Error;
      console.log(`❌ ${testName} - Attempt ${attempt}/${maxAttempts} - ${error.message}`);
      
      if (attempt === maxAttempts) {
        metrics.push({
          testName,
          duration: 0,
          success: false,
          error: lastError.message
        });
      }
      
      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  throw lastError!;
}

// Synthetic tests
test.describe('SINGGLEBEE Synthetic Monitoring', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
  });

  test.afterAll(async () => {
    await browser.close();
    
    // Output metrics
    console.log('\n📊 Test Metrics Summary:');
    console.table(metrics);
    
    // Check for failures
    const failures = metrics.filter(m => !m.success);
    if (failures.length > 0) {
      console.log('\n❌ Failed Tests:');
      failures.forEach(f => {
        console.log(`  - ${f.testName}: ${f.error}`);
      });
      process.exit(1);
    }
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    
    // Set user agent
    await page.setUserAgent('SINGGLEBEE-Synthetic-Monitor/1.0');
    
    // Ignore HTTPS errors for testing
    await page.context().overridePermissions(BASE_URL, []);
    
    // Enable performance monitoring
    await page.goto('about:blank');
    await page.evaluate(() => {
      // Enable performance monitoring
      if ('PerformanceObserver' in window) {
        new PerformanceObserver((list) => {
          // Performance data will be collected
        }).observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
      }
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Homepage Load', async () => {
    await retryTest(async () => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Check critical elements
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
      
      // Check performance
      const performance = await measurePerformance(page);
      expect(performance.firstContentfulPaint).toBeLessThan(1500);
      expect(performance.largestContentfulPaint).toBeLessThan(2500);
      expect(performance.timeToInteractive).toBeLessThan(3000);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(TEST_TIMEOUT);
      
    }, 'Homepage Load');
  });

  test('User Authentication', async () => {
    await retryTest(async () => {
      // Navigate to login page
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_USER.password);
      
      // Submit form
      await page.click('[data-testid="login-button"]');
      
      // Wait for successful login
      await page.waitForURL('**/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Verify user is logged in
      const userName = await page.locator('[data-testid="user-name"]').textContent();
      expect(userName).toContain(TEST_USER.firstName);
      
    }, 'User Authentication');
  });

  test('Product Search', async () => {
    await retryTest(async () => {
      await page.goto(BASE_URL);
      
      // Search for product
      await page.fill('[data-testid="search-input"]', 'Tamil Poetry');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Verify search results
      const results = page.locator('[data-testid="product-card"]');
      await expect(results.first()).toBeVisible();
      
      // Check if specific product is found
      const productTitle = await results.first().locator('[data-testid="product-title"]').textContent();
      expect(productTitle).toContain('Poetry');
      
    }, 'Product Search');
  });

  test('Add to Cart', async () => {
    await retryTest(async () => {
      // Go to product page
      await page.goto(`${BASE_URL}/products`);
      
      // Find and click on a product
      await page.click('[data-testid="product-card"]:first-child');
      
      // Wait for product page to load
      await page.waitForSelector('[data-testid="product-details"]');
      
      // Add to cart
      await page.click('[data-testid="add-to-cart-button"]');
      
      // Verify cart updated
      const cartCount = await page.locator('[data-testid="cart-count"]').textContent();
      expect(parseInt(cartCount || '0')).toBeGreaterThan(0);
      
      // Go to cart
      await page.click('[data-testid="cart-icon"]');
      
      // Verify cart contents
      await page.waitForSelector('[data-testid="cart-items"]');
      const cartItems = page.locator('[data-testid="cart-item"]');
      await expect(cartItems.first()).toBeVisible();
      
    }, 'Add to Cart');
  });

  test('Checkout Flow', async () => {
    await retryTest(async () => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_USER.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      // Add product to cart
      await page.goto(`${BASE_URL}/products`);
      await page.click('[data-testid="product-card"]:first-child');
      await page.click('[data-testid="add-to-cart-button"]');
      
      // Go to checkout
      await page.click('[data-testid="cart-icon"]');
      await page.click('[data-testid="checkout-button"]');
      
      // Fill shipping address
      await page.fill('[data-testid="first-name"]', TEST_USER.firstName);
      await page.fill('[data-testid="last-name"]', TEST_USER.lastName);
      await page.fill('[data-testid="phone"]', TEST_USER.phone);
      await page.fill('[data-testid="address-street"]', TEST_USER.address.street);
      await page.fill('[data-testid="address-city"]', TEST_USER.address.city);
      await page.fill('[data-testid="address-state"]', TEST_USER.address.state);
      await page.fill('[data-testid="address-zip"]', TEST_USER.address.zipCode);
      
      // Continue to payment
      await page.click('[data-testid="continue-to-payment"]');
      
      // Verify payment options
      await expect(page.locator('[data-testid="payment-options"]')).toBeVisible();
      
      // Select payment method
      await page.click('[data-testid="payment-method-cod"]');
      
      // Place order
      await page.click('[data-testid="place-order-button"]');
      
      // Verify order confirmation
      await page.waitForSelector('[data-testid="order-confirmation"]');
      await expect(page.locator('[data-testid="order-success-message"]')).toBeVisible();
      
      // Get order ID
      const orderId = await page.locator('[data-testid="order-id"]').textContent();
      expect(orderId).toMatch(/SB-\d+/);
      
    }, 'Checkout Flow');
  });

  test('API Health Check', async () => {
    await retryTest(async () => {
      // Test API endpoint directly
      const response = await page.request.get(`${BASE_URL}/api/v1/health`);
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('status', 'healthy');
      
      // Test database connectivity
      expect(body.data).toHaveProperty('database', 'connected');
      expect(body.data).toHaveProperty('redis', 'connected');
      
    }, 'API Health Check');
  });

  test('Payment Gateway Integration', async () => {
    await retryTest(async () => {
      // Go to checkout with test product
      await page.goto(`${BASE_URL}/products`);
      await page.click('[data-testid="product-card"]:first-child');
      await page.click('[data-testid="add-to-cart-button"]');
      await page.click('[data-testid="cart-icon"]');
      await page.click('[data-testid="checkout-button"]');
      
      // Fill shipping address quickly
      await page.fill('[data-testid="first-name"]', TEST_USER.firstName);
      await page.fill('[data-testid="last-name"]', TEST_USER.lastName);
      await page.fill('[data-testid="phone"]', TEST_USER.phone);
      await page.click('[data-testid="continue-to-payment"]');
      
      // Test payment gateway availability
      await expect(page.locator('[data-testid="payment-method-cashfree"]')).toBeVisible();
      
      // Check payment gateway health
      const paymentHealth = await page.request.get(`${BASE_URL}/api/v1/payments/health`);
      expect(paymentHealth.status()).toBe(200);
      
      const healthBody = await paymentHealth.json();
      expect(healthBody.data).toHaveProperty('cashfree', 'available');
      
    }, 'Payment Gateway Integration');
  });

  test('Error Handling', async () => {
    await retryTest(async () => {
      // Test 404 page
      const response = await page.goto(`${BASE_URL}/non-existent-page`);
      expect(response?.status()).toBe(404);
      
      // Check 404 page elements
      await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="back-to-home"]')).toBeVisible();
      
      // Test API error handling
      const errorResponse = await page.request.get(`${BASE_URL}/api/v1/non-existent-endpoint`);
      expect(errorResponse.status()).toBe(404);
      
      const errorBody = await errorResponse.json();
      expect(errorBody).toHaveProperty('success', false);
      expect(errorBody.error).toHaveProperty('code', 'NOT_FOUND');
      
    }, 'Error Handling');
  });

  test('Performance Metrics', async () => {
    await retryTest(async () => {
      // Navigate to homepage
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Collect performance metrics
      const performance = await measurePerformance(page);
      
      // Check Core Web Vitals
      expect(performance.firstContentfulPaint).toBeLessThan(1500); // 1.5s
      expect(performance.largestContentfulPaint).toBeLessThan(2500); // 2.5s
      expect(performance.timeToInteractive).toBeLessThan(3000); // 3s
      
      // Check resource loading
      const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map((entry: any) => ({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize || 0
        }));
      });
      
      // Check for large resources
      const largeResources = resources.filter((r: any) => r.size > 500 * 1024); // > 500KB
      expect(largeResources.length).toBeLessThan(5);
      
      // Check for slow resources
      const slowResources = resources.filter((r: any) => r.duration > 2000); // > 2s
      expect(slowResources.length).toBeLessThan(3);
      
    }, 'Performance Metrics');
  });

  test('Security Headers', async () => {
    await retryTest(async () => {
      const response = await page.goto(BASE_URL);
      
      // Check security headers
      const headers = response?.headers();
      
      expect(headers).toHaveProperty('x-frame-options');
      expect(headers).toHaveProperty('x-content-type-options');
      expect(headers).toHaveProperty('x-xss-protection');
      expect(headers).toHaveProperty('strict-transport-security');
      expect(headers).toHaveProperty('content-security-policy');
      
      // Check HTTPS redirect
      if (BASE_URL.startsWith('http://')) {
        const httpsResponse = await page.request.get(BASE_URL.replace('http://', 'https://'));
        expect(httpsResponse.status()).toBeLessThan(400);
      }
      
    }, 'Security Headers');
  });
});

// Export metrics for external monitoring systems
export { metrics };
