# 🚨 CRITICAL SECURITY ACTIONS - IMMEDIATE IMPLEMENTATION REQUIRED

## 📋 **IMMEDIATE ACTIONS (DO THESE NOW)**

### **1. ROTATE EXPOSED SECRETS**

#### **Frontend Secrets (.env.local)**
```bash
# IMMEDIATELY ROTATE THESE KEYS:
# - Gemini API Key (if exposed)
# - Any Cashfree keys in frontend

# Steps:
# 1. Go to Google Cloud Console → APIs & Services → Credentials
# 2. Create new API key, delete old one
# 3. Update environment variables
# 4. NEVER commit .env files
```

#### **Backend Secrets (server/.env)**
```bash
# IMMEDIATELY GENERATE NEW SECRETS:
# - JWT_ACCESS_SECRET (use: openssl rand -base64 64)
# - JWT_REFRESH_SECRET (use: openssl rand -base64 64)
# - Cashfree APP_ID & SECRET_KEY
# - Gemini API Key
# - Admin credentials

# Generate secure secrets:
JWT_ACCESS_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
```

### **2. REMOVE SECRETS FROM REPOSITORY HISTORY**

```bash
# Install BFG Repo-Cleaner
wget -O bfg.jar https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove all .env files from history
java -jar bfg.jar --delete-files .env.local --delete-files .env .

# Clean up refs
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push cleaned history
git push --force-with-lease origin main
```

### **3. SECURE GITIGNORE (UPDATED)**
```
# Environment files - CRITICAL: Never commit these
.env*
!.env.example

# Build directories
node_modules/
dist/
dist-ssr/
build/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db
```

### **4. JWT SECURITY IMPLEMENTATION**

#### **Backend Security (server/app.js)**
```javascript
// Secure JWT configuration
const jwtOptions = {
  accessSecret: process.env.JWT_ACCESS_SECRET, // 64+ chars
  refreshSecret: process.env.JWT_REFRESH_SECRET, // 64+ chars
  accessTokenExpiry: '15m', // Short lifetime
  refreshTokenExpiry: '7d',
  issuer: 'singglebee.com',
  audience: 'singglebee-users'
};

// Secure cookie settings
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};
```

### **5. PAYMENT SECURITY IMPLEMENTATION**

#### **Cashfree Integration Security**
```javascript
// Webhook signature verification
const crypto = require('crypto');

function verifyCashfreeSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Raw body preservation for webhook verification
app.use('/api/v1/payments/webhook', 
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
```

### **6. INFRASTRUCTURE SECURITY**

#### **HTTPS Enforcement**
```javascript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

#### **Security Headers (Helmet)**
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### **7. PRODUCTION DEPLOYMENT CHECKLIST**

#### **Environment Variables (Production)**
```bash
# Required production secrets (set in hosting provider)
NODE_ENV=production
JWT_ACCESS_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
CASHFREE_APP_ID=<production-app-id>
CASHFREE_SECRET_KEY=<production-secret>
GEMINI_API_KEY=<production-api-key>
MONGODB_URI=<production-mongodb-uri>
REDIS_URL=<production-redis-uri>

# URLs
FRONTEND_URL=https://singglebee.com
BACKEND_URL=https://api.singglebee.com
```

#### **Database Security**
```javascript
// MongoDB connection security
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin',
  ssl: process.env.NODE_ENV === 'production',
  sslValidate: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

### **8. MONITORING & LOGGING**

#### **Security Logging**
```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

// Log security events
securityLogger.info('Login attempt', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString(),
  success: false
});
```

### **9. TESTING SECURITY IMPLEMENTATION**

#### **Security Tests**
```javascript
// Test JWT security
describe('JWT Security', () => {
  test('should use short access token expiry', () => {
    expect(process.env.JWT_ACCESS_EXPIRES_IN).toBe('15m');
  });
  
  test('should reject expired tokens', async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(response.status).toBe(401);
  });
});
```

### **10. CI/CD SECURITY PIPELINE**

#### **GitHub Actions Security**
```yaml
name: Security Checks
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --audit-level high
        
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
          
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
```

## 🚨 **IMMEDIATE ACTION REQUIRED**

1. **RIGHT NOW**: Rotate all exposed API keys
2. **TODAY**: Remove secrets from git history
3. **THIS WEEK**: Implement all security measures
4. **BEFORE LAUNCH**: Complete all security checklist items

## 📞 **EMERGENCY CONTACTS**

- **Google Cloud Support**: For API key rotation
- **Cashfree Support**: For payment key rotation
- **Security Team**: For incident response

---

**⚠️ FAILURE TO IMPLEMENT THESE MEASURES WILL RESULT IN SECURITY BREACHES AND DATA COMPROMISE**
