// Cashfree Payment Service for SINGGLEBEE
import crypto from 'crypto';
import axios from 'axios';

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
  apiBase: string;
}

interface CreateOrderRequest {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerDetails: {
    customerId: string;
    customerEmail: string;
    customerPhone: string;
  };
  orderNote?: string;
  orderMeta?: {
    notifyUrl: string;
    returnUrl?: string;
  };
}

interface PaymentSession {
  paymentSessionId: string;
  cfOrderId: string;
  orderAmount: number;
  orderCurrency: string;
  paymentLink: string;
  expiryTime: string;
  paymentMethods: string[];
}

interface VerifyPaymentRequest {
  orderId: string;
  signature: string;
  timestamp: string;
  payload: string;
}

class CashfreeService {
  private config: CashfreeConfig;

  constructor(config: CashfreeConfig) {
    this.config = config;
  }

  // Create payment order
  async createOrder(orderData: CreateOrderRequest): Promise<PaymentSession> {
    try {
      const url = `${this.config.apiBase}/orders`;
      
      const payload = {
        orderId: orderData.orderId,
        orderAmount: orderData.orderAmount,
        orderCurrency: orderData.orderCurrency,
        customerDetails: orderData.customerDetails,
        orderNote: orderData.orderNote || 'Order from SINGGLEBEE',
        orderMeta: {
          ...orderData.orderMeta,
          notifyUrl: `${process.env.BACKEND_URL || 'https://api.singglebee.com'}/api/v1/payments/webhook/cashfree`,
          returnUrl: `${process.env.FRONTEND_URL || 'https://singglebee.com'}/order/success`,
        },
      };

      const signature = this.generateSignature(payload);

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': this.config.appId,
          'x-client-secret': this.config.secretKey,
          'x-request-id': this.generateRequestId(),
          'x-idempotency-key': orderData.orderId,
        },
      });

      if (response.data.status !== 'ACTIVE') {
        throw new Error(`Cashfree order creation failed: ${response.data.message}`);
      }

      return {
        paymentSessionId: response.data.payment_session_id,
        cfOrderId: response.data.cf_order_id,
        orderAmount: response.data.order_amount,
        orderCurrency: response.data.order_currency,
        paymentLink: response.data.payment_link,
        expiryTime: response.data.order_expiry_time,
        paymentMethods: response.data.payment_methods || [],
      };
    } catch (error: any) {
      console.error('Cashfree createOrder error:', error.response?.data || error.message);
      throw new Error(`Failed to create payment order: ${error.response?.data?.message || error.message}`);
    }
  }

  // Verify payment webhook
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  // Verify payment status
  async verifyPayment(orderId: string): Promise<any> {
    try {
      const url = `${this.config.apiBase}/orders/${orderId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': this.config.appId,
          'x-client-secret': this.config.secretKey,
          'x-request-id': this.generateRequestId(),
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Cashfree verifyPayment error:', error.response?.data || error.message);
      throw new Error(`Failed to verify payment: ${error.response?.data?.message || error.message}`);
    }
  }

  // Process refund
  async processRefund(orderId: string, refundAmount: number, refundId: string): Promise<any> {
    try {
      const url = `${this.config.apiBase}/orders/${orderId}/refunds`;
      
      const payload = {
        refundId,
        refundAmount,
        refundNote: 'Refund processed by SINGGLEBEE',
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': this.config.appId,
          'x-client-secret': this.config.secretKey,
          'x-request-id': this.generateRequestId(),
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Cashfree processRefund error:', error.response?.data || error.message);
      throw new Error(`Failed to process refund: ${error.response?.data?.message || error.message}`);
    }
  }

  // Generate signature for requests
  private generateSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(payloadString)
      .digest('hex');
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get payment link for frontend
  getPaymentLink(paymentSessionId: string): string {
    const baseUrl = this.config.environment === 'production' 
      ? 'https://payments.cashfree.com' 
      : 'https://sandbox.cashfree.com';
    
    return `${baseUrl}/order/${paymentSessionId}`;
  }
}

// Initialize Cashfree service based on environment
const getCashfreeService = (): CashfreeService => {
  const environment = process.env.CASHFREE_ENV || 'sandbox';
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    throw new Error('Cashfree credentials not configured');
  }

  const config: CashfreeConfig = {
    appId,
    secretKey,
    environment: environment as 'sandbox' | 'production',
    apiBase: environment === 'production' 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg',
  };

  return new CashfreeService(config);
};

export default CashfreeService;
export { getCashfreeService };
export type { CreateOrderRequest, PaymentSession, VerifyPaymentRequest };
