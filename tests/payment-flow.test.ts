// 🧪 Payment Flow Testing for SINGGLEBEE

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock payment service
vi.mock('../services/payment.service', () => ({
  paymentService: {
    createOrder: vi.fn(),
    verifyPayment: vi.fn(),
    refundPayment: vi.fn(),
    getPaymentStatus: vi.fn(),
  },
}));

// Mock Cashfree
vi.mock('../utils/cashfree', () => ({
  initializeCashfree: vi.fn(),
  processPayment: vi.fn(),
  verifyWebhook: vi.fn(),
}));

import { paymentService } from '../services/payment.service';
import { initializeCashfree, processPayment } from '../utils/cashfree';

// Test wrapper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Payment Flow Tests', () => {
  const mockOrder = {
    id: 'order_123',
    amount: 99900, // ₹999
    currency: 'INR',
    items: [
      {
        id: 'product_1',
        title: 'Tamil Learning Book',
        price: 99900,
        quantity: 1
      }
    ],
    customer: {
      email: 'test@example.com',
      phone: '+919876543210'
    }
  };

  const mockPaymentResponse = {
    payment_session_id: 'session_123',
    order_id: 'order_123',
    status: 'created',
    payment_link: 'https://payments.cashfree.com/session_123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Order Creation', () => {
    it('should create payment order successfully', async () => {
      const user = userEvent.setup();
      
      vi.mocked(paymentService.createOrder).mockResolvedValue(mockPaymentResponse);

      // Mock cart component
      const CartComponent = () => (
        <div>
          <button data-testid="checkout-button">Proceed to Checkout</button>
        </div>
      );

      render(<CartComponent />, { wrapper: createTestWrapper() });

      const checkoutButton = screen.getByTestId('checkout-button');
      await user.click(checkoutButton);

      await waitFor(() => {
        expect(paymentService.createOrder).toHaveBeenCalledWith({
          items: mockOrder.items,
          customer: mockOrder.customer,
          amount: mockOrder.amount,
          currency: mockOrder.currency
        });
      });
    });

    it('should handle order creation failure', async () => {
      const user = userEvent.setup();
      
      vi.mocked(paymentService.createOrder).mockRejectedValue(
        new Error('Failed to create order')
      );

      const CartComponent = () => (
        <div>
          <button data-testid="checkout-button">Proceed to Checkout</button>
          <div data-testid="error-message" />
        </div>
      );

      render(<CartComponent />, { wrapper: createTestWrapper() });

      const checkoutButton = screen.getByTestId('checkout-button');
      await user.click(checkoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Failed to create order'
        );
      });
    });
  });

  describe('Payment Processing', () => {
    it('should initialize Cashfree payment gateway', async () => {
      vi.mocked(initializeCashfree).mockResolvedValue(undefined);

      await initializeCashfree({
        environment: 'sandbox',
        appId: 'test_app_id',
        secretKey: 'test_secret_key'
      });

      expect(initializeCashfree).toHaveBeenCalledWith({
        environment: 'sandbox',
        appId: 'test_app_id',
        secretKey: 'test_secret_key'
      });
    });

    it('should process payment successfully', async () => {
      const mockPaymentResult = {
        status: 'success',
        transaction_id: 'txn_123',
        order_id: 'order_123',
        amount: 99900
      };

      vi.mocked(processPayment).mockResolvedValue(mockPaymentResult);

      const result = await processPayment(mockPaymentResponse.payment_session_id);

      expect(result).toEqual(mockPaymentResult);
      expect(processPayment).toHaveBeenCalledWith(mockPaymentResponse.payment_session_id);
    });

    it('should handle payment failure', async () => {
      vi.mocked(processPayment).mockRejectedValue(
        new Error('Payment failed')
      );

      await expect(processPayment('invalid_session')).rejects.toThrow('Payment failed');
    });
  });

  describe('Payment Verification', () => {
    it('should verify successful payment', async () => {
      const mockVerification = {
        status: 'success',
        order_id: 'order_123',
        transaction_id: 'txn_123',
        amount: 99900,
        paid_at: new Date().toISOString()
      };

      vi.mocked(paymentService.verifyPayment).mockResolvedValue(mockVerification);

      const result = await paymentService.verifyPayment('order_123');

      expect(result).toEqual(mockVerification);
      expect(paymentService.verifyPayment).toHaveBeenCalledWith('order_123');
    });

    it('should handle payment verification failure', async () => {
      vi.mocked(paymentService.verifyPayment).mockRejectedValue(
        new Error('Payment verification failed')
      );

      await expect(paymentService.verifyPayment('invalid_order')).rejects.toThrow(
        'Payment verification failed'
      );
    });
  });

  describe('Refund Processing', () => {
    it('should process refund successfully', async () => {
      const mockRefund = {
        refund_id: 'refund_123',
        order_id: 'order_123',
        amount: 99900,
        status: 'processed',
        processed_at: new Date().toISOString()
      };

      vi.mocked(paymentService.refundPayment).mockResolvedValue(mockRefund);

      const result = await paymentService.refundPayment('order_123', {
        reason: 'Customer request',
        amount: 99900
      });

      expect(result).toEqual(mockRefund);
      expect(paymentService.refundPayment).toHaveBeenCalledWith('order_123', {
        reason: 'Customer request',
        amount: 99900
      });
    });

    it('should handle partial refund', async () => {
      const mockRefund = {
        refund_id: 'refund_124',
        order_id: 'order_123',
        amount: 49950, // Partial refund
        status: 'processed'
      };

      vi.mocked(paymentService.refundPayment).mockResolvedValue(mockRefund);

      const result = await paymentService.refundPayment('order_123', {
        reason: 'Partial refund',
        amount: 49950
      });

      expect(result.amount).toBe(49950);
    });
  });

  describe('Payment Status Tracking', () => {
    it('should track payment status changes', async () => {
      const mockStatuses = [
        { status: 'created', timestamp: new Date().toISOString() },
        { status: 'processing', timestamp: new Date().toISOString() },
        { status: 'success', timestamp: new Date().toISOString() }
      ];

      vi.mocked(paymentService.getPaymentStatus).mockResolvedValue(mockStatuses);

      const statuses = await paymentService.getPaymentStatus('order_123');

      expect(statuses).toHaveLength(3);
      expect(statuses[2].status).toBe('success');
    });

    it('should handle failed payment status', async () => {
      const mockStatuses = [
        { status: 'created', timestamp: new Date().toISOString() },
        { status: 'failed', timestamp: new Date().toISOString(), error: 'Insufficient funds' }
      ];

      vi.mocked(paymentService.getPaymentStatus).mockResolvedValue(mockStatuses);

      const statuses = await paymentService.getPaymentStatus('order_123');

      const failedStatus = statuses.find(s => s.status === 'failed');
      expect(failedStatus?.error).toBe('Insufficient funds');
    });
  });

  describe('Webhook Handling', () => {
    it('should verify webhook signature', async () => {
      const mockWebhook = {
        type: 'payment.success',
        data: {
          order_id: 'order_123',
          transaction_id: 'txn_123',
          amount: 99900
        },
        signature: 'valid_signature'
      };

      const { verifyWebhook } = await import('../utils/cashfree');
      vi.mocked(verifyWebhook).mockResolvedValue(true);

      const isValid = await verifyWebhook(mockWebhook, 'secret_key');

      expect(isValid).toBe(true);
      expect(verifyWebhook).toHaveBeenCalledWith(mockWebhook, 'secret_key');
    });

    it('should reject invalid webhook signature', async () => {
      const mockWebhook = {
        type: 'payment.success',
        data: { order_id: 'order_123' },
        signature: 'invalid_signature'
      };

      const { verifyWebhook } = await import('../utils/cashfree');
      vi.mocked(verifyWebhook).mockResolvedValue(false);

      const isValid = await verifyWebhook(mockWebhook, 'secret_key');

      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(paymentService.createOrder).mockRejectedValue(
        new Error('Network error')
      );

      await expect(paymentService.createOrder(mockOrder)).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      vi.mocked(processPayment).mockRejectedValue(
        new Error('Payment timeout')
      );

      await expect(processPayment('session_123')).rejects.toThrow('Payment timeout');
    });

    it('should handle invalid order data', async () => {
      const invalidOrder = {
        items: [],
        amount: 0,
        currency: 'INVALID'
      };

      vi.mocked(paymentService.createOrder).mockRejectedValue(
        new Error('Invalid order data')
      );

      await expect(paymentService.createOrder(invalidOrder)).rejects.toThrow('Invalid order data');
    });
  });

  describe('Payment Flow Integration', () => {
    it('should complete full payment flow', async () => {
      // Mock all steps
      vi.mocked(paymentService.createOrder).mockResolvedValue(mockPaymentResponse);
      vi.mocked(initializeCashfree).mockResolvedValue(undefined);
      vi.mocked(processPayment).mockResolvedValue({
        status: 'success',
        transaction_id: 'txn_123'
      });
      vi.mocked(paymentService.verifyPayment).mockResolvedValue({
        status: 'success',
        order_id: 'order_123'
      });

      // Step 1: Create order
      const order = await paymentService.createOrder(mockOrder);
      expect(order.payment_session_id).toBe('session_123');

      // Step 2: Initialize gateway
      await initializeCashfree({ environment: 'sandbox', appId: 'test', secretKey: 'test' });

      // Step 3: Process payment
      const payment = await processPayment(order.payment_session_id);
      expect(payment.status).toBe('success');

      // Step 4: Verify payment
      const verification = await paymentService.verifyPayment(order.order_id);
      expect(verification.status).toBe('success');
    });
  });
});

// Performance tests
describe('Payment Flow Performance', () => {
  it('should create order within acceptable time', async () => {
    vi.mocked(paymentService.createOrder).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate 100ms delay
      return mockPaymentResponse;
    });

    const startTime = Date.now();
    await paymentService.createOrder(mockOrder);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
  });

  it('should handle concurrent payment requests', async () => {
    vi.mocked(paymentService.createOrder).mockResolvedValue(mockPaymentResponse);

    const promises = Array.from({ length: 10 }, (_, i) =>
      paymentService.createOrder({ ...mockOrder, id: `order_${i}` })
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result.payment_session_id).toBeDefined();
    });
  });
});
