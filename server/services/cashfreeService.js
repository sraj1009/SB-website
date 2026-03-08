import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Cashfree Payment Service
 * Handles payment session creation and webhook verification
 */
class CashfreeService {
    constructor() {
        this.appId = process.env.CASHFREE_APP_ID;
        this.secretKey = process.env.CASHFREE_SECRET_KEY;
        this.apiVersion = process.env.CASHFREE_API_VERSION || '2023-08-01';
        this.environment = process.env.CASHFREE_ENV || 'sandbox';

        this.baseUrl = this.environment === 'production'
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg';
    }

    /**
     * Check if Cashfree is configured
     */
    isConfigured() {
        return !!(this.appId && this.secretKey);
    }

    /**
     * Create a payment session for an order
     * @param {Object} order - Order object
     * @param {Object} customer - Customer details
     * @returns {Promise<Object>} Payment session details
     */
    async createPaymentSession(order, customer) {
        if (!this.isConfigured()) {
            throw new Error('Cashfree is not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY');
        }

        try {
            const payload = {
                order_id: order.orderId,
                order_amount: order.pricing.total,
                order_currency: 'INR',
                customer_details: {
                    customer_id: customer.id || `cust_${Date.now()}`,
                    customer_name: customer.fullName,
                    customer_email: customer.email,
                    customer_phone: customer.phone
                },
                order_meta: {
                    return_url: `${process.env.FRONTEND_URL}/checkout/success?sess_id=${order.orderId}`,
                    notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/payments/webhook`
                },
                order_note: `SINGGLEBEE Order #${order.orderId}`
            };

            const response = await axios.post(
                `${this.baseUrl}/orders`,
                payload,
                {
                    headers: {
                        'x-client-id': this.appId,
                        'x-client-secret': this.secretKey,
                        'x-api-version': this.apiVersion,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info(`Cashfree payment session created for order ${order.orderId}`);

            return {
                success: true,
                paymentSessionId: response.data.payment_session_id,
                cfOrderId: response.data.cf_order_id,
                orderId: order.orderId,
                orderAmount: order.pricing.total,
                environment: this.environment
            };
        } catch (error) {
            logger.error(`Cashfree API error: ${error.response?.data?.message || error.message}`);
            throw new Error(error.response?.data?.message || 'Failed to create payment session');
        }
    }

    /**
     * Verify webhook signature
     * @param {Object} payload - Webhook payload
     * @param {string} signature - x-webhook-signature header
     * @param {string} timestamp - x-webhook-timestamp header
     * @returns {boolean} Is signature valid
     */
    verifyWebhookSignature(payload, signature, timestamp) {
        if (!this.secretKey) {
            logger.error('Cashfree secret key not configured for webhook verification');
            return false;
        }

        try {
            const signatureData = timestamp + JSON.stringify(payload);
            const expectedSignature = crypto
                .createHmac('sha256', this.secretKey)
                .update(signatureData)
                .digest('base64');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            logger.error(`Webhook signature verification error: ${error.message}`);
            return false;
        }
    }

    /**
     * Get payment status for an order
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} Payment status
     */
    async getPaymentStatus(orderId) {
        if (!this.isConfigured()) {
            throw new Error('Cashfree is not configured');
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/orders/${orderId}`,
                {
                    headers: {
                        'x-client-id': this.appId,
                        'x-client-secret': this.secretKey,
                        'x-api-version': this.apiVersion
                    }
                }
            );

            return {
                success: true,
                orderId: response.data.order_id,
                orderStatus: response.data.order_status,
                orderAmount: response.data.order_amount,
                cfOrderId: response.data.cf_order_id
            };
        } catch (error) {
            logger.error(`Cashfree status check error: ${error.response?.data?.message || error.message}`);
            throw new Error(error.response?.data?.message || 'Failed to get payment status');
        }
    }

    /**
     * Get payment details (transactions) for an order
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} Payment/transaction details
     */
    async getPaymentDetails(orderId) {
        if (!this.isConfigured()) {
            throw new Error('Cashfree is not configured');
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/orders/${orderId}/payments`,
                {
                    headers: {
                        'x-client-id': this.appId,
                        'x-client-secret': this.secretKey,
                        'x-api-version': this.apiVersion
                    }
                }
            );

            return {
                success: true,
                payments: response.data
            };
        } catch (error) {
            logger.error(`Cashfree payment details error: ${error.response?.data?.message || error.message}`);
            throw new Error(error.response?.data?.message || 'Failed to get payment details');
        }
    }
}

// Export singleton instance
export default new CashfreeService();
