/**
 * Email service for password reset, order confirmation, etc.
 * Supports SMTP (Nodemailer), SendGrid, and SMS notifications.
 */
import logger from '../utils/logger.js';

let transporter = null;

/**
 * Initialize email transporter based on env config
 */
async function getTransporter() {
  if (transporter) return transporter;

  // SendGrid via API (uses axios - no extra deps)
  if (process.env.SENDGRID_API_KEY) {
    return { type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY };
  }

  // SMTP via Nodemailer
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = await import('nodemailer');
      transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });
      
      // Verify connection
      await transporter.verify();
      logger.info('SMTP connection verified');
      return transporter;
    } catch (err) {
      logger.error(`SMTP connection failed: ${err.message}`);
      return null;
    }
  }

  return null;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transport = await getTransporter();
  if (!transport) {
    throw new Error('No email transport configured');
  }

  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@singglebee.com';
  const fromName = process.env.FROM_NAME || 'SINGGLEBEE';
  const subject = 'Reset your SINGGLEBEE password';
  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #F59E0B; margin: 0;">🐝 SINGGLEBEE</h1>
                <p style="color: #666; margin: 5px 0;">Premium Marketplace</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                <p style="color: #666; line-height: 1.6;">You requested a password reset for your SINGGLEBEE account. Click the button below to set a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background: #F59E0B; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    This link expires in 1 hour. If you didn't request this, please ignore this email.
                </p>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 11px;">
                <p>&copy; 2024 SINGGLEBEE. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    `;

  if (transport.type === 'sendgrid') {
    const axios = (await import('axios')).default;
    await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/html', value: html }],
      },
      {
        headers: {
          Authorization: `Bearer ${transport.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info(`Password reset email sent to ${toEmail} via SendGrid`);
  } else {
    await transport.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
    });
    logger.info(`Password reset email sent to ${toEmail} via SMTP`);
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(toEmail, orderId, totalAmount, orderDetails = null) {
  const transport = await getTransporter();
  if (!transport) return;

  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@singglebee.com';
  const fromName = process.env.FROM_NAME || 'SINGGLEBEE';
  const subject = `Order Confirmed - #${orderId}`;
  
  const itemsHtml = orderDetails?.items?.map(item => `
    <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <div style="display: flex; align-items: center;">
                ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 15px; border-radius: 5px;">` : ''}
                <div>
                    <strong>${item.title}</strong><br>
                    <small style="color: #666;">Qty: ${item.quantity} × ₹${item.price}</small>
                </div>
            </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
            ₹${(item.price * item.quantity).toLocaleString('en-IN')}
        </td>
    </tr>
  `).join('') || '';

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #F59E0B; margin: 0;">🐝 SINGGLEBEE</h1>
                <p style="color: #666; margin: 5px 0;">Order Confirmation</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-top: 0;">Thank You for Your Order! 🎉</h2>
                <p style="color: #666; line-height: 1.6;">Your order has been confirmed and is being processed. We'll notify you when it ships.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Order Details</h3>
                    <p><strong>Order ID:</strong> ${orderId}</p>
                    <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                    <p><strong>Payment Status:</strong> <span style="color: #28a745;">Pending</span></p>
                </div>
                
                ${itemsHtml ? `
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${itemsHtml}
                    </table>
                </div>
                ` : ''}
                
                <div style="background: white; padding: 20px; border-radius: 8px;">
                    <h3 style="color: #333; margin-top: 0;">Order Summary</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Subtotal:</span>
                        <span>₹${totalAmount?.toLocaleString('en-IN') || '—'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Shipping:</span>
                        <span>Free</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Tax (GST):</span>
                        <span>Included</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 2px solid #F59E0B; padding-top: 10px;">
                        <span>Total:</span>
                        <span style="color: #F59E0B;">₹${totalAmount?.toLocaleString('en-IN') || '—'}</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://singglebee.com'}/orders" 
                   style="background: #F59E0B; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    Track Your Order
                </a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 11px;">
                <p>&copy; 2024 SINGGLEBEE. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    `;

  try {
    if (transport.type === 'sendgrid') {
      const axios = (await import('axios')).default;
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [{ type: 'text/html', value: html }],
        },
        {
          headers: {
            Authorization: `Bearer ${transport.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      logger.info(`Order confirmation email sent to ${toEmail} via SendGrid`);
    } else {
      await transport.sendMail({ 
        from: `${fromName} <${fromEmail}>`, 
        to: toEmail, 
        subject, 
        html 
      });
      logger.info(`Order confirmation email sent to ${toEmail} via SMTP`);
    }
  } catch (err) {
    logger.error(`Order confirmation email failed: ${err.message}`);
  }
}

/**
 * Send shipping notification email
 */
export async function sendShippingNotificationEmail(toEmail, orderId, trackingNumber, trackingUrl) {
  const transport = await getTransporter();
  if (!transport) return;

  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@singglebee.com';
  const fromName = process.env.FROM_NAME || 'SINGGLEBEE';
  const subject = `Your Order #${orderId} Has Shipped! 🚚`;
  
  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #F59E0B; margin: 0;">🐝 SINGGLEBEE</h1>
                <p style="color: #666; margin: 5px 0;">Shipping Update</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-top: 0;">Good News! Your Order Has Shipped 🎉</h2>
                <p style="color: #666; line-height: 1.6;">Your order is on its way! Track your package to see the latest updates.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Shipping Details</h3>
                    <p><strong>Order ID:</strong> ${orderId}</p>
                    <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                    <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${trackingUrl}" 
                       style="background: #F59E0B; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                        Track Package
                    </a>
                </div>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 11px;">
                <p>&copy; 2024 SINGGLEBEE. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    `;

  try {
    if (transport.type === 'sendgrid') {
      const axios = (await import('axios')).default;
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [{ type: 'text/html', value: html }],
        },
        {
          headers: {
            Authorization: `Bearer ${transport.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      await transport.sendMail({ 
        from: `${fromName} <${fromEmail}>`, 
        to: toEmail, 
        subject, 
        html 
      });
    }
    logger.info(`Shipping notification sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Shipping notification failed: ${err.message}`);
  }
}

export default {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
};
