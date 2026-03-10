# 🚀 PRODUCTION DEPLOYMENT GUIDE - SINGGLEBEE

## ⚠️ **CRITICAL SECURITY WARNING**

**DO NOT COMMIT .env FILES TO GIT**  
**USE HOSTING PROVIDER'S ENVIRONMENT SECRETS**

---

## 🔐 **STEP 1: ROTATE API KEYS (IMMEDIATE)**

### **Gemini API Key**
1. Go to: https://console.cloud.google.com/
2. Navigate: **APIs & Services → Credentials**
3. Find: **"API keys"** section
4. **Delete** the exposed key
5. **Create** new key with restrictions:
   - API restrictions: Gemini API only
   - Application restrictions: singglebee.com
   - IP restrictions: Your server IPs

### **Cashfree Payment Keys**
1. Go to: https://dashboard.cashfree.com/
2. Navigate: **Settings → API Keys**
3. **Delete** all existing keys
4. **Create** new production keys:
   - Environment: Production
   - Webhook URL: https://api.singglebee.com/api/v1/payments/webhook
   - Whitelist your domain: singglebee.com

---

## 🔧 **STEP 2: SET PRODUCTION ENVIRONMENT**

### **Option A: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Set environment variables
vercel env add NODE_ENV=production
vercel env add JWT_ACCESS_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add CASHFREE_APP_ID
vercel env add CASHFREE_SECRET_KEY
vercel env add GEMINI_API_KEY
vercel env add MONGODB_URI
vercel env add REDIS_URL
```

### **Option B: AWS/Render**
```bash
# AWS Elastic Beanstalk
eb setenv NODE_ENV production
eb setenv JWT_ACCESS_SECRET "your_secure_secret"
eb setenv MONGODB_URI "your_mongodb_uri"

# Render Dashboard
# Go to dashboard.render.com → Your Service → Environment
# Add all variables from PRODUCTION-SETUP.md
```

### **Option C: Docker Production**
```bash
# Create production docker-compose.yml
cp docker-compose.yml docker-compose.prod.yml

# Edit with production values
# Use Docker secrets or environment files
```

---

## 🛡️ **STEP 3: SECURITY CONFIGURATION**

### **HTTPS Setup**
```bash
# Let's Encrypt (Recommended)
certbot --nginx -d singglebee.com

# Or use hosting provider's SSL
# Vercel: Automatic SSL
# AWS: ACM Certificate Manager
# DigitalOcean: Let's Encrypt integration
```

### **Security Headers**
Your security middleware is already configured with:
- ✅ Helmet security headers
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ CSP (Content Security Policy)
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input sanitization

---

## 🗄️ **STEP 4: DATABASE SETUP**

### **MongoDB Production**
```bash
# MongoDB Atlas (Recommended)
# Cluster: M0 or higher
# Region: Mumbai (for Indian users)
# Backup: Enable daily backups
# Monitoring: Enable cloud manager
```

### **Redis Production**
```bash
# Redis Cloud or ElastiCache
# Cluster mode for high availability
# Enable automatic failover
# Set up monitoring and alerts
```

---

## 💳 **STEP 5: PAYMENT GATEWAY TESTING**

### **Cashfree Sandbox Testing**
```bash
# Test in sandbox first
CASHFREE_ENV=sandbox
npm run test:payment

# Verify webhook endpoints
curl -X POST https://api.singglebee.com/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test_signature" \
  -d '{"type":"payment.success","data":{"order_id":"test"}}'
```

### **Production Payment Flow**
1. Test order creation
2. Test payment processing
3. Test success/failure scenarios
4. Test refund processing
5. Verify webhook signatures

---

## 📊 **STEP 6: MONITORING SETUP**

### **Application Monitoring**
```bash
# Sentry (Recommended)
npm install @sentry/node
# Configure DSN in environment variables
```

### **Performance Monitoring**
```bash
# Vercel Analytics (Built-in)
# Google Analytics
# New Relic APM
```

### **Database Monitoring**
```bash
# MongoDB Atlas Monitoring
# Redis Cloud Monitoring
# Set up alerts for:
# - Connection failures
# - High CPU usage
# - Memory usage
# - Disk space
```

---

## 🚀 **STEP 7: DEPLOYMENT**

### **Frontend Deployment (Vercel)**
```bash
# Build and deploy
npm run build
vercel --prod

# Verify deployment
curl https://singglebee.com
```

### **Backend Deployment**
```bash
# Option A: Vercel Serverless
vercel --prod

# Option B: Docker Container
docker build -t singglebee-api .
docker push your-registry/singglebee-api:latest

# Option C: AWS ECS
eb deploy production
```

---

## 🔍 **STEP 8: POST-DEPLOYMENT VALIDATION**

### **Security Checklist**
- [ ] HTTPS working correctly
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] API keys rotated
- [ ] Environment variables set
- [ ] No secrets in code

### **Functionality Checklist**
- [ ] Database connections working
- [ ] Payment flow testing
- [ ] User registration/login
- [ ] Product catalog loading
- [ ] Cart functionality
- [ ] Order processing
- [ ] Email notifications

### **Performance Checklist**
- [ ] Page load times < 3 seconds
- [ ] Mobile responsive design
- [ ] Image optimization working
- [ ] CDN configuration active
- [ ] SEO meta tags present

### **Monitoring Checklist**
- [ ] Error tracking active
- [ ] Performance monitoring
- [ ] Database monitoring
- [ ] Uptime monitoring
- [ ] Security alerts configured

---

## 🚨 **EMERGENCY PROCEDURES**

### **Security Incident**
1. **Immediate Actions**:
   - Rotate all API keys
   - Check logs for suspicious activity
   - Enable additional monitoring

2. **Communication**:
   - Notify users of data breach
   - Contact payment gateway
   - Document incident timeline

3. **Post-Incident**:
   - Conduct security audit
   - Update security procedures
   - Review access controls

### **Production Issues**
1. **Database Issues**:
   - Switch to read-only mode
   - Activate backup database
   - Notify users of service disruption

2. **Payment Issues**:
   - Enable manual payment verification
   - Contact Cashfree support
   - Hold orders for review

3. **Performance Issues**:
   - Enable CDN caching
   - Scale up resources
   - Optimize database queries

---

## 📞 **SUPPORT CONTACTS**

### **Emergency Contacts**
- **Security Team**: security@singglebee.com
- **Technical Lead**: tech@singglebee.com
- **Payment Issues**: payments@singglebee.com

### **Provider Support**
- **Google Cloud**: https://cloud.google.com/support
- **Cashfree**: https://dashboard.cashfree.com/support
- **Vercel**: https://vercel.com/support
- **MongoDB**: https://cloud.mongodb.com/support

---

## ✅ **DEPLOYMENT COMPLETE**

When all steps are completed:
1. **Announce launch** to stakeholders
2. **Monitor closely** for first 48 hours
3. **Have rollback plan** ready
4. **Customer support** on high alert

---

**⚠️ FINAL REMINDER**: 
- **NEVER commit secrets to git**
- **ALWAYS use HTTPS in production**
- **MONITOR security and performance continuously**
- **HAVE incident response plan ready**

**🎉 Your SINGGLEBEE application will be production-ready! 🐝**
