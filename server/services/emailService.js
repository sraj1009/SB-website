/**
 * Email service for password reset, order confirmation, etc.
 * Supports SMTP (Nodemailer) or SendGrid.
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
                auth: process.env.SMTP_USER ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                } : undefined
            });
            return transporter;
        } catch (err) {
            logger.error(`Nodemailer not installed. Run: npm install nodemailer`);
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

    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@singglebee.com';
    const subject = 'Reset your SINGGLEBEE password';
    const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">SINGGLEBEE</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetUrl}" style="background: #F59E0B; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Password</a></p>
            <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 11px;">&copy; SINGGLEBEE</p>
        </div>
    `;

    if (transport.type === 'sendgrid') {
        const axios = (await import('axios')).default;
        await axios.post(
            'https://api.sendgrid.com/v3/mail/send',
            {
                personalizations: [{ to: [{ email: toEmail }] }],
                from: { email: fromEmail, name: 'SINGGLEBEE' },
                subject,
                content: [{ type: 'text/html', value: html }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${transport.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        logger.info(`Password reset email sent to ${toEmail} via SendGrid`);
    } else {
        await transport.sendMail({
            from: fromEmail,
            to: toEmail,
            subject,
            html
        });
        logger.info(`Password reset email sent to ${toEmail} via SMTP`);
    }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(toEmail, orderId, totalAmount) {
    const transport = await getTransporter();
    if (!transport) return;

    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@singglebee.com';
    const subject = `Order confirmed - #${orderId}`;
    const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">SINGGLEBEE</h2>
            <p>Thank you for your order!</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Total:</strong> ₹${totalAmount?.toLocaleString('en-IN') || '—'}</p>
            <p>Our hive team will process your order and notify you when it ships.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 11px;">&copy; SINGGLEBEE</p>
        </div>
    `;

    try {
        if (transport.type === 'sendgrid') {
            const axios = (await import('axios')).default;
            await axios.post(
                'https://api.sendgrid.com/v3/mail/send',
                {
                    personalizations: [{ to: [{ email: toEmail }] }],
                    from: { email: fromEmail, name: 'SINGGLEBEE' },
                    subject,
                    content: [{ type: 'text/html', value: html }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${transport.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        } else {
            await transport.sendMail({ from: fromEmail, to: toEmail, subject, html });
        }
    } catch (err) {
        logger.error(`Order confirmation email failed: ${err.message}`);
    }
}

export default {
    sendPasswordResetEmail,
    sendOrderConfirmationEmail
};
