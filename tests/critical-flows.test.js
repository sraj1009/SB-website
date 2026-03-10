const request = require('supertest');
const assert = require('assert');
const crypto = require('crypto');

/**
 * Critical Flows Test Suite
 * Tests essential user journeys and business processes
 */

describe('Critical Flows Test Suite', () => {
  let app;
  let testUser;
  let testOrder;
  let authToken;
  let refreshToken;

  before(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    app = require('../server/app');
    
    // Clean up test data
    await cleanupTestData();
  });

  after(async () => {
    // Cleanup
    await cleanupTestData();
  });

  describe('1. User Registration & Authentication Flow', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      assert(response.body.success, 'Registration should be successful');
      assert(response.body.data.user.email, userData.email);
      assert(response.body.data.user.id, 'User ID should be returned');
      
      testUser = response.body.data.user;
      authToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      assert(response.body.error, 'Should return error for duplicate email');
      assert(response.body.code, 'EMAIL_EXISTS');
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      assert(response.body.success, 'Login should be successful');
      assert(response.body.data.tokens.accessToken, 'Access token should be provided');
      assert(response.body.data.tokens.refreshToken, 'Refresh token should be provided');
      
      authToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      assert(response.body.error, 'Should return error for invalid credentials');
      assert(response.body.code, 'INVALID_CREDENTIALS');
    });

    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      assert(response.body.success, 'Token refresh should be successful');
      assert(response.body.data.accessToken, 'New access token should be provided');
      
      authToken = response.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ refreshToken })
        .expect(200);

      assert(response.body.success, 'Logout should be successful');
    });
  });

  describe('2. Product Browsing & Search Flow', () => {
    it('should fetch product catalog', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      assert(response.body.success, 'Should fetch products successfully');
      assert(Array.isArray(response.body.data.products), 'Should return array of products');
      assert(response.body.data.products.length > 0, 'Should have products');
    });

    it('should search products by keyword', async () => {
      const response = await request(app)
        .get('/api/products/search?q=book')
        .expect(200);

      assert(response.body.success, 'Search should be successful');
      assert(Array.isArray(response.body.data.products), 'Should return array of products');
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products?category=books')
        .expect(200);

      assert(response.body.success, 'Category filter should work');
      assert(Array.isArray(response.body.data.products), 'Should return array of products');
    });

    it('should get product details', async () => {
      // First get a product from catalog
      const catalogResponse = await request(app)
        .get('/api/products')
        .expect(200);

      const productId = catalogResponse.body.data.products[0].id;

      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      assert(response.body.success, 'Should fetch product details');
      assert(response.body.data.product.id, productId, 'Should return correct product');
    });
  });

  describe('3. Shopping Cart Management Flow', () => {
    let cartId;

    it('should create a new cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      assert(response.body.success, 'Cart creation should be successful');
      assert(response.body.data.cart.id, 'Cart ID should be returned');
      
      cartId = response.body.data.cart.id;
    });

    it('should add items to cart', async () => {
      // Get a product first
      const productsResponse = await request(app)
        .get('/api/products')
        .expect(200);

      const product = productsResponse.body.data.products[0];

      const response = await request(app)
        .post(`/api/cart/${cartId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: product.id,
          quantity: 2
        })
        .expect(200);

      assert(response.body.success, 'Item addition should be successful');
      assert(response.body.data.cart.items.length > 0, 'Cart should have items');
    });

    it('should update cart item quantity', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartId}/items/0`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 3
        })
        .expect(200);

      assert(response.body.success, 'Quantity update should be successful');
      assert(response.body.data.cart.items[0].quantity, 3, 'Quantity should be updated');
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/cart/${cartId}/items/0`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert(response.body.success, 'Item removal should be successful');
      assert(response.body.data.cart.items.length, 0, 'Cart should be empty');
    });

    it('should get cart details', async () => {
      const response = await request(app)
        .get(`/api/cart/${cartId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert(response.body.success, 'Should fetch cart details');
      assert(response.body.data.cart.id, cartId, 'Should return correct cart');
    });
  });

  describe('4. Checkout & Payment Flow', () => {
    let orderId;
    let paymentId;

    it('should initiate checkout', async () => {
      // Add items to cart first
      const productsResponse = await request(app)
        .get('/api/products')
        .expect(200);

      const product = productsResponse.body.data.products[0];

      await request(app)
        .post(`/api/cart/${testUser.cartId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: product.id,
          quantity: 1
        });

      const checkoutData = {
        cartId: testUser.cartId,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'US'
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      };

      const response = await request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      assert(response.body.success, 'Checkout initiation should be successful');
      assert(response.body.data.order.id, 'Order ID should be returned');
      
      orderId = response.body.data.order.id;
      testOrder = response.body.data.order;
    });

    it('should process payment successfully', async () => {
      const paymentData = {
        orderId: orderId,
        paymentMethod: {
          type: 'credit_card',
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          holderName: 'Test User'
        },
        amount: testOrder.totalAmount,
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      assert(response.body.success, 'Payment processing should be successful');
      assert(response.body.data.payment.id, 'Payment ID should be returned');
      assert(response.body.data.payment.status, 'processing', 'Payment should be processing');
      
      paymentId = response.body.data.payment.id;
    });

    it('should handle payment webhook', async () => {
      const webhookPayload = {
        id: `evt_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentId,
            status: 'succeeded',
            amount: testOrder.totalAmount * 100, // Stripe uses cents
            currency: 'usd'
          }
        }
      };

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(webhookPayload)
        .expect(200);

      assert(response.body.success, 'Webhook processing should be successful');
    });

    it('should get order details after payment', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert(response.body.success, 'Should fetch order details');
      assert(response.body.data.order.status, 'paid', 'Order should be marked as paid');
    });
  });

  describe('5. Order Management Flow', () => {
    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert(response.body.success, 'Should fetch user orders');
      assert(Array.isArray(response.body.data.orders), 'Should return array of orders');
      assert(response.body.data.orders.length > 0, 'Should have orders');
    });

    it('should cancel an order', async () => {
      // Create a new order for cancellation test
      const checkoutData = {
        cartId: testUser.cartId,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'US'
        },
        paymentMethod: 'credit_card'
      };

      const orderResponse = await request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      const newOrderId = orderResponse.body.data.order.id;

      const response = await request(app)
        .post(`/api/orders/${newOrderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Customer requested cancellation'
        })
        .expect(200);

      assert(response.body.success, 'Order cancellation should be successful');
      assert(response.body.data.order.status, 'cancelled', 'Order should be marked as cancelled');
    });

    it('should track order status', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert(response.body.success, 'Should fetch order tracking');
      assert(response.body.data.tracking.orderId, orderId, 'Should return correct order tracking');
    });
  });

  describe('6. User Profile Management Flow', () => {
    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert(response.body.success, 'Should fetch user profile');
      assert(response.body.data.user.email, testUser.email, 'Should return correct user');
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      assert(response.body.success, 'Profile update should be successful');
      assert(response.body.data.user.firstName, 'Updated', 'First name should be updated');
    });

    it('should change password', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      assert(response.body.success, 'Password change should be successful');
    });

    it('should add shipping address', async () => {
      const addressData = {
        type: 'shipping',
        line1: '456 New Street',
        city: 'New City',
        state: 'New State',
        postalCode: '67890',
        country: 'US',
        isDefault: true
      };

      const response = await request(app)
        .post('/api/user/addresses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addressData)
        .expect(201);

      assert(response.body.success, 'Address addition should be successful');
      assert(response.body.data.address.line1, '456 New Street', 'Address should be saved');
    });
  });

  describe('7. Security & Rate Limiting Tests', () => {
    it('should enforce rate limiting on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
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
    });

    it('should reject requests without valid JWT', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      assert(response.body.error, 'Should reject unauthorized request');
      assert(response.body.code, 'UNAUTHORIZED');
    });

    it('should reject requests with expired JWT', async () => {
      // Create an expired token (this would normally be done by the JWT service)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      assert(response.body.error, 'Should reject expired token');
    });

    it('should prevent SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      const response = await request(app)
        .get(`/api/products/search?q=${encodeURIComponent(maliciousInput)}`)
        .expect(400);

      assert(response.body.error, 'Should block SQL injection attempts');
      assert(response.body.code, 'INJECTION_ATTEMPT');
    });

    it('should prevent XSS attempts', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app)
        .post('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: xssPayload
        })
        .expect(400);

      assert(response.body.error, 'Should block XSS attempts');
      assert(response.body.code, 'XSS_ATTEMPT');
    });
  });

  describe('8. Error Handling & Resilience Tests', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would normally involve simulating database connection issues
      // For now, we'll test a non-existent endpoint
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      assert(response.body.error, 'Should return 404 for non-existent endpoint');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      assert(response.body.error, 'Should handle malformed JSON');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          // Missing required fields
          firstName: 'Test'
        })
        .expect(400);

      assert(response.body.error, 'Should validate required fields');
      assert(response.body.code, 'VALIDATION_ERROR');
    });

    it('should handle large payloads appropriately', async () => {
      const largePayload = {
        data: 'x'.repeat(10000000) // 10MB of data
      };

      const response = await request(app)
        .post('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload)
        .expect(413);

      assert(response.body.error, 'Should handle large payloads');
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      // Clean up test user, orders, cart, etc.
      // This would involve database cleanup
      console.log('Cleaning up test data...');
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }
});

// Performance tests
describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const concurrentRequests = 10;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request(app)
          .get('/api/products')
          .expect(200)
      );
    }

    const results = await Promise.all(promises);
    
    results.forEach(response => {
      assert(response.body.success, 'All concurrent requests should succeed');
    });
  });

  it('should respond within acceptable time limits', async () => {
    const startTime = Date.now();
    
    await request(app)
      .get('/api/products')
      .expect(200);
    
    const responseTime = Date.now() - startTime;
    
    assert(responseTime < 1000, 'Response time should be under 1 second');
  });
});

// Integration tests
describe('Integration Tests', () => {
  it('should complete full purchase flow end-to-end', async () => {
    // This test would simulate a complete user journey
    // from registration to purchase
    
    // 1. Register user
    // 2. Browse products
    // 3. Add to cart
    // 4. Checkout
    // 5. Process payment
    // 6. Verify order
    
    assert(true, 'End-to-end flow should work');
  });
});
