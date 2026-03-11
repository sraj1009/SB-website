// Cashfree Payment Service for SINGGLEBEE
import crypto from 'crypto';
import axios from 'axios';

class CashfreeService {
  constructor(config) {
    this.config = config;
  }

  // Create payment order
  async createOrder(orderData) {
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
    } catch (error) {
      console.error('Cashfree createOrder error:', error.response?.data || error.message);
      throw new Error(`Failed to create payment order: ${error.response?.data?.message || error.message}`);
    }
  }

  // Verify payment webhook
  verifyWebhookSignature(payload, signature) {
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
  async verifyPayment(orderId) {
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
    } catch (error) {
      console.error('Cashfree verifyPayment error:', error.response?.data || error.message);
      throw new Error(`Failed to verify payment: ${error.response?.data?.message || error.message}`);
    }
  }

  // Process refund
  async processRefund(orderId, refundAmount, refundId) {
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
    } catch (error) {
      console.error('Cashfree processRefund error:', error.response?.data || error.message);
      throw new Error(`Failed to process refund: ${error.response?.data?.message || error.message}`);
    }
  }

  // Generate signature for requests
  generateSignature(payload) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(payloadString)
      .digest('hex');
  }

  // Generate unique request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get payment link for frontend
  getPaymentLink(paymentSessionId) {
    const baseUrl = this.config.environment === 'production' 
      ? 'https://payments.cashfree.com' 
      : 'https://sandbox.cashfree.com';
    
    return `${baseUrl}/order/${paymentSessionId}`;
  }
}

// Initialize Cashfree service based on environment
const getCashfreeService = () => {
  const environment = process.env.CASHFREE_ENV || 'sandbox';
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    throw new Error('Cashfree credentials not configured');
  }

  const config = {
    appId,
    secretKey,
    environment,
    apiBase: environment === 'production' 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg',
  };

  return new CashfreeService(config);
};

export default CashfreeService;
export { getCashfreeService };
