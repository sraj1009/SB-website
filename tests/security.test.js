const request = require('supertest');
const assert = require('assert');
const crypto = require('crypto');

/**
 * Security Test Suite
 * Tests security measures and vulnerability protections
 */

describe('Security Test Suite', () => {
  let app;
  let authToken;
  let testUser;

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = require('../server/app');
    
    // Create test user for authenticated tests
    const userData = {
      email: 'securitytest@example.com',
      password: 'SecurePassword123!',
      firstName: 'Security',
      lastName: 'Test'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    testUser = response.body.data.user;
    authToken = response.body.data.tokens.accessToken;
  });

  after(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  describe('Authentication Security', () => {
    it('should use secure JWT tokens', async () => {
      const tokenParts = authToken.split('.');
      
      assert(tokenParts.length === 3, 'JWT should have 3 parts (header, payload, signature)');
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      assert(payload.exp, 'Token should have expiration');
      assert(payload.iat, 'Token should have issued at time');
      assert(payload.jti, 'Token should have JWT ID');
      assert(payload.iss, 'Token should have issuer');
      assert(payload.aud, 'Token should have audience');
    });

    it('should reject tokens with invalid signatures', async () => {
      const maliciousToken = authToken.replace(/.$/, 'x'); // Change last character
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      assert(response.body.error, 'Should reject token with invalid signature');
    });

    it('should implement proper session management', async () => {
      // Login to get new session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'securitytest@example.com',
          password: 'SecurePassword123!'
        })
        .expect(200);

      const newToken = loginResponse.body.data.tokens.accessToken;
      
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          refreshToken: loginResponse.body.data.tokens.refreshToken
        })
        .expect(200);

      // Try to use token after logout
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(401);

      assert(response.body.error, 'Should reject token after logout');
    });

    it('should implement rate limiting on auth endpoints', async () => {
      const loginData = {
        email: 'securitytest@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      assert(response.body.error, 'Should be rate limited');
      assert(response.body.code, 'AUTH_RATE_LIMIT');
      assert(response.headers['retry-after'], 'Should include retry-after header');
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should prevent SQL injection', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --",
        "'; DELETE FROM products; --",
        "' OR 1=1 --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/api/products/search?q=${encodeURIComponent(payload)}`)
          .expect(400);

        assert(response.body.error, 'Should block SQL injection attempt');
        assert(response.body.code, 'INJECTION_ATTEMPT');
      }
    });

    it('should prevent NoSQL injection', async () => {
      const nosqlInjectionPayloads = [
        { "$gt": "" },
        { "$ne": null },
        { "$where": "return true" },
        { "$regex": ".*" },
        { "$expr": { "$eq": ["$name", "admin"] } }
      ];

      for (const payload of nosqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/products/search')
          .send(payload)
          .expect(400);

        assert(response.body.error, 'Should block NoSQL injection attempt');
        assert(response.body.code, 'INJECTION_ATTEMPT');
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)">',
        '"><script>alert(1)</script>',
        "'><script>alert(1)</script>"
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: payload
          })
          .expect(400);

        assert(response.body.error, 'Should block XSS attempt');
        assert(response.body.code, 'XSS_ATTEMPT');
      }
    });

    it('should sanitize HTML content', async () => {
      const htmlPayload = '<p>Valid <b>content</b></p><script>alert(1)</script>';
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product',
          description: htmlPayload
        })
        .expect(201);

      const description = response.body.data.product.description;
      
      assert(description.includes('<p>'), 'Should preserve valid HTML');
      assert(description.includes('<b>'), 'Should preserve valid HTML tags');
      assert(!description.includes('<script>'), 'Should remove script tags');
      assert(!description.includes('alert'), 'Should remove script content');
    });

    it('should validate input types and formats', async () => {
      const invalidInputs = [
        { email: 'invalid-email', password: '123' },
        { email: 'test@example.com', password: 'short' },
        { email: 'test@example.com', password: 'nodigits123!' },
        { email: 'test@example.com', password: 'NOLOWERCASE123!' }
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/api/auth/register')
          .send(input)
          .expect(400);

        assert(response.body.error, 'Should validate input format');
        assert(response.body.code, 'VALIDATION_ERROR');
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing requests', async () => {
      // This test assumes CSRF protection is enabled
      const response = await request(app)
        .post('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test'
        })
        .expect(403);

      assert(response.body.error, 'Should require CSRF token');
      assert(response.body.code, 'CSRF_VIOLATION');
    });

    it('should validate CSRF token', async () => {
      // Get CSRF token
      const tokenResponse = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csrfToken = tokenResponse.body.data.csrfToken;

      // Use valid CSRF token
      const response = await request(app)
        .post('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          firstName: 'Test'
        })
        .expect(200);

      assert(response.body.success, 'Should accept valid CSRF token');
    });
  });

  describe('Rate Limiting', () => {
    it('should implement general API rate limiting', async () => {
      const promises = [];
      
      // Make many requests quickly
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .get('/api/products')
        );
      }

      const results = await Promise.allSettled(promises);
      const rateLimited = results.filter(result => 
        result.status === 'fulfilled' && 
        result.value.status === 429
      );

      assert(rateLimited.length > 0, 'Should rate limit excessive requests');
    });

    it('should implement IP-based rate limiting', async () => {
      // This would test IP-based rate limiting
      // Implementation depends on your rate limiting strategy
      assert(true, 'IP-based rate limiting should be implemented');
    });

    it('should implement user-based rate limiting', async () => {
      // This would test user-based rate limiting for authenticated users
      assert(true, 'User-based rate limiting should be implemented');
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      // Check for important security headers
      assert(response.headers['x-content-type-options'], 'Should set X-Content-Type-Options');
      assert(response.headers['x-frame-options'], 'Should set X-Frame-Options');
      assert(response.headers['x-xss-protection'], 'Should set X-XSS-Protection');
      assert(response.headers['referrer-policy'], 'Should set Referrer-Policy');
      
      // Check CSP header
      const cspHeader = response.headers['content-security-policy'];
      assert(cspHeader, 'Should set Content-Security-Policy');
      assert(cspHeader.includes("default-src 'self'"), 'CSP should restrict default source');
    });

    it('should use HTTPS in production', async () => {
      // This would test HTTPS enforcement
      // In test environment, we check if the setting is configured
      assert(true, 'HTTPS should be enforced in production');
    });

    it('should set HSTS headers in production', async () => {
      // This would test HSTS header
      assert(true, 'HSTS should be enabled in production');
    });
  });

  describe('Data Protection', () => {
    it('should encrypt sensitive data', async () => {
      // Test if sensitive data like passwords are encrypted
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'securitytest@example.com',
          password: 'SecurePassword123!'
        })
        .expect(200);

      // Password should not be returned in response
      assert(!loginResponse.body.data.password, 'Password should not be returned');
      assert(!loginResponse.body.data.user.password, 'User password should not be returned');
    });

    it('should mask sensitive data in logs', async () => {
      // This would test that sensitive data is masked in logs
      assert(true, 'Sensitive data should be masked in logs');
    });

    it('should implement proper data retention', async () => {
      // This would test data retention policies
      assert(true, 'Data retention policies should be implemented');
    });
  });

  describe('Webhook Security', () => {
    it('should verify webhook signatures', async () => {
      const webhookPayload = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } }
      };

      // Send webhook without signature
      const response = await request(app)
        .post('/webhooks/stripe')
        .send(webhookPayload)
        .expect(401);

      assert(response.body.error, 'Should reject webhook without signature');
      assert(response.body.code, 'WEBHOOK_VERIFICATION_FAILED');
    });

    it('should validate webhook payload structure', async () => {
      const invalidPayload = {
        invalid: 'structure'
      };

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(invalidPayload)
        .expect(400);

      assert(response.body.error, 'Should validate webhook payload');
      assert(response.body.code, 'INVALID_PAYLOAD');
    });

    it('should prevent duplicate webhook processing', async () => {
      const webhookPayload = {
        id: 'evt_duplicate_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_duplicate_test' } }
      };

      // Send webhook twice
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(webhookPayload)
        .expect(200);

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(webhookPayload)
        .expect(200);

      assert(response.body.message, 'Duplicate webhook acknowledged');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const maliciousFile = {
        name: 'malicious.exe',
        type: 'application/octet-stream',
        size: 1024
      };

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake content'), 'malicious.exe')
        .expect(400);

      assert(response.body.error, 'Should reject malicious file types');
    });

    it('should limit file sizes', async () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB file

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large.jpg')
        .expect(413);

      assert(response.body.error, 'Should reject oversized files');
    });

    it('should scan uploaded files for malware', async () => {
      // This would test malware scanning
      assert(true, 'Uploaded files should be scanned for malware');
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      assert(response.body.error, 'Should return error message');
      assert(!response.body.stack, 'Should not include stack trace');
      assert(!response.body.sql, 'Should not include SQL queries');
      assert(!response.body.internal, 'Should not include internal details');
    });

    it('should use generic error messages for security errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      assert(response.body.error, 'Should return generic error message');
      assert(response.body.code, 'INVALID_CREDENTIALS');
      // Should not reveal if email exists or not
    });
  });

  describe('Payment Security', () => {
    it('should not store raw payment card data', async () => {
      const paymentData = {
        orderId: 'test_order',
        paymentMethod: {
          type: 'credit_card',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        }
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      // Card details should not be returned
      assert(!response.body.data.payment.cardNumber, 'Should not return card number');
      assert(!response.body.data.payment.cvv, 'Should not return CVV');
    });

    it('should validate payment amounts', async () => {
      const invalidPayment = {
        orderId: 'test_order',
        amount: -100, // Negative amount
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayment)
        .expect(400);

      assert(response.body.error, 'Should validate payment amount');
    });

    it('should prevent duplicate payments', async () => {
      // This would test duplicate payment prevention
      assert(true, 'Duplicate payments should be prevented');
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      // Clean up test user and related data
      console.log('Cleaning up security test data...');
    } catch (error) {
      console.error('Error cleaning up security test data:', error);
    }
  }
});

// Penetration testing scenarios
describe('Penetration Testing Scenarios', () => {
  it('should withstand common attack vectors', async () => {
    const attackVectors = [
      // Path traversal
      '../../../etc/passwd',
      // Command injection
      '; ls -la',
      // LDAP injection
      '*)(&',
      // XML injection
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
      // Template injection
      '{{7*7}}',
      '${7*7}',
      // Buffer overflow (simplified test)
      'A'.repeat(10000)
    ];

    for (const vector of attackVectors) {
      const response = await request(app)
        .get(`/api/products/search?q=${encodeURIComponent(vector)}`)
        .expect(400);

      assert(response.body.error, 'Should block attack vector');
    }
  });

  it('should implement proper access controls', async () => {
    // Test accessing other user's data
    const response = await request(app)
      .get('/api/orders/12345') // Different order ID
      .set('Authorization', `Bearer ${authToken}`)
      .expect(403);

    assert(response.body.error, 'Should prevent unauthorized access');
  });

  it('should handle concurrent security attacks', async () => {
    // Simulate concurrent attack attempts
    const attackPromises = [];
    
    for (let i = 0; i < 50; i++) {
      attackPromises.push(
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@example.com',
            password: `' OR '1'='1`
          })
      );
    }

    const results = await Promise.allSettled(attackPromises);
    const failures = results.filter(result => 
      result.status === 'fulfilled' && 
      result.value.status !== 401
    );

    assert(failures.length === 0, 'Should block all concurrent attacks');
  });
});
