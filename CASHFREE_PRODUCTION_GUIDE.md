# Cashfree Production Integration Guide

## Overview
This guide will help you integrate Cashfree payment gateway in production mode for the SINGGLEBEE application.

## Prerequisites
- Cashfree production account
- Production API credentials (App ID and Secret Key)
- SSL certificate for your domain
- Business verification completed with Cashfree

## Step 1: Get Production Credentials

1. Log in to your Cashfree dashboard
2. Navigate to Settings → API Keys
3. Generate production credentials
4. Note down your App ID and Secret Key

## Step 2: Configure Environment Variables

Update your `.env.production` file with the following:

```bash
# Cashfree Production Configuration
CASHFREE_APP_ID=your_production_app_id
CASHFREE_SECRET_KEY=your_production_secret_key
CASHFREE_ENV=production

# API Endpoints
BACKEND_URL=https://api.singglebee.com
FRONTEND_URL=https://singglebee.com
```

## Step 3: Update Frontend Configuration

Update your frontend `.env.production` file:

```bash
VITE_API_BASE_URL=https://api.singglebee.com/api/v1
VITE_API_URL=https://api.singglebee.com/api/v1
VITE_CASHFREE_ENV=production
```

## Step 4: Webhook Configuration

1. In Cashfree dashboard, navigate to Webhooks
2. Add webhook URL: `https://api.singglebee.com/api/v1/payments/webhook/cashfree`
3. Select events to receive:
   - Order Paid
   - Order Failed
   - Order Refunded
4. Set webhook secret for signature verification

## Step 5: SSL Certificate

Ensure your domain has a valid SSL certificate:
- Use Let's Encrypt (free) or purchase from a CA
- Install certificate on your server
- Update your web server configuration

## Step 6: Test Production Integration

1. Deploy the updated application
2. Test with small amounts (₹1-₹5)
3. Verify webhook delivery
4. Check payment status updates

## Step 7: Security Considerations

- Never commit secrets to version control
- Use environment variables for credentials
- Implement IP whitelisting if needed
- Monitor webhook signatures
- Set up proper logging and alerts

## Step 8: Error Handling

The application handles common Cashfree errors:
- Invalid credentials
- Network timeouts
- Payment failures
- Webhook verification errors

## Step 9: Monitoring

Monitor the following metrics:
- Payment success rate
- Webhook delivery time
- API response times
- Error rates

## Step 10: Customer Support

Prepare for customer queries:
- Payment failure reasons
- Refund process
- Order status tracking
- Contact information

## Testing Checklist

- [ ] Production credentials configured
- [ ] Webhook URL accessible
- [ ] SSL certificate valid
- [ ] Test payment successful
- [ ] Webhook received and verified
- [ ] Order status updated correctly
- [ ] Refund process working
- [ ] Error handling tested

## Common Issues and Solutions

### 1. Webhook Not Received
- Check firewall settings
- Verify webhook URL is accessible
- Ensure SSL certificate is valid

### 2. Payment Verification Failed
- Check API credentials
- Verify signature calculation
- Ensure correct API version

### 3. Order Status Not Updated
- Check webhook processing
- Verify database connection
- Review error logs

## Support Contacts

- Cashfree Support: support@cashfree.com
- Documentation: https://docs.cashfree.com
- API Reference: https://api.cashfree.com/docs

## Rate Limits

- Orders: 100 requests per minute
- Refunds: 50 requests per minute
- Webhooks: 1000 requests per minute

## Compliance

Ensure compliance with:
- PCI DSS requirements
- RBI guidelines for payments
- Data protection regulations
- Tax regulations

## Backup Payment Methods

Consider offering alternative payment methods:
- UPI (direct)
- Net banking
- Wallets
- Card payments

This completes the Cashfree production integration setup.
