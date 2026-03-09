import logger from './logger.js';
import axios from 'axios';

/**
 * Notification Service
 * Handles WhatsApp/SMS notifications for orders.
 * Currently supports a mock implementation; can be extended to Twilio or WhatsApp Business API.
 */
class NotificationService {
    constructor() {
        this.waApiUrl = process.env.WHATSAPP_API_URL;
        this.waToken = process.env.WHATSAPP_API_TOKEN;
        this.waPhoneId = process.env.WHATSAPP_PHONE_ID;
    }

    /**
     * Send order confirmation notification
     */
    async sendOrderConfirmation(order) {
        const { orderId, shippingAddress, pricing } = order;
        const phone = shippingAddress.phone;
        const name = shippingAddress.fullName;

        logger.info(`Sending order confirmation notification to ${phone} for order ${orderId}`);

        // Template message concept
        const message = `🐝 Hello ${name}! Your SINGGLEBEE order #${orderId} has been received. 🍯 Total: ₹${pricing.total.toLocaleString('en-IN')}. We'll notify you when it ships!`;

        if (this.waToken && this.waPhoneId) {
            return this.sendWhatsAppMessage(phone, message);
        }

        // Mock/Log fallback
        logger.info(`[MOCK NOTIFICATION] To: ${phone} | Content: ${message}`);
        return true;
    }

    /**
     * Send shipping update
     */
    async sendShippingUpdate(order) {
        const { orderId, shippingAddress, trackingNumber } = order;
        const phone = shippingAddress.phone;

        const message = `🚚 Great news! Your SINGGLEBEE order #${orderId} has been shipped! tracking ID: ${trackingNumber || 'Processing'}. Buzzing your way soon! 🐝`;

        if (this.waToken && this.waPhoneId) {
            return this.sendWhatsAppMessage(phone, message);
        }

        logger.info(`[MOCK NOTIFICATION] To: ${phone} | Content: ${message}`);
        return true;
    }

    async sendWhatsAppMessage(to, text) {
        try {
            // Clean phone number (remove +, spaces, ensure country code)
            const cleanPhone = to.replace(/\D/g, '');
            const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

            const response = await axios.post(
                `https://graph.facebook.com/v17.0/${this.waPhoneId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: phoneWithCountry,
                    type: 'text',
                    text: { body: text },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.waToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info(`WhatsApp message sent successfully: ${response.data.messages[0].id}`);
            return true;
        } catch (error) {
            logger.error(`WhatsApp notification failed: ${error.response?.data?.error?.message || error.message}`);
            return false;
        }
    }
}

export const notificationService = new NotificationService();
export default notificationService;
