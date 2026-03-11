# SINGGLEBEE Production Launch Guide

## 🚀 Quick Start - Launch Your E-Commerce Platform

### Prerequisites
- Node.js 18.0.0 or higher
- MongoDB Atlas cluster configured
- Redis instance (optional but recommended)
- Production environment variables set

### One-Command Launch
```bash
npm start
```

This single command will:
1. ✅ Build the frontend for production
2. ✅ Start the backend server (port 5000)
3. ✅ Start the frontend server (port 3000)
4. ✅ Perform health checks
5. ✅ Display access URLs

## 📋 Available Launch Commands

### Primary Commands
```bash
# Full production launch (recommended)
npm start

# Build only (for deployment pipelines)
npm run build:production

# Start backend only
npm run start:backend

# Start frontend only (requires build first)
npm run start:frontend

# Development mode
npm run dev
```

### Utility Commands
```bash
# Check deployment prerequisites
npm run deploy:check

# Build for production only
npm run deploy:build

# Full-stack development (MongoDB + Redis + Frontend + Backend)
npm run full-stack
```

## 🌐 Access URLs After Launch

Once `npm start` completes successfully:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main e-commerce website |
| **Backend API** | http://localhost:5000 | REST API endpoints |
| **Health Check** | http://localhost:5000/health | Service status |
| **API Docs** | http://localhost:5000/api-docs | Swagger documentation |

## ⚙️ Environment Configuration

### Production Environment File
Create `server/.env.production` with:

```env
# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://singglebee_app:PASSWORD@cluster.mongodb.net/singglebee-prod?retryWrites=true&w=majority&ssl=true&authSource=admin

# JWT Secrets (generate new ones)
JWT_ACCESS_SECRET=YOUR_SUPER_SECRET_JWT_KEY_MIN_32_CHARS_LONG
JWT_REFRESH_SECRET=YOUR_SUPER_SECRET_REFRESH_KEY_MIN_32_CHARS_LONG

# Payment Gateway (Cashfree)
CASHFREE_APP_ID=your_production_cashfree_app_id
CASHFREE_SECRET_KEY=your_production_cashfree_secret_key
CASHFREE_ENV=production

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_admin_password

# Redis (optional but recommended)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:your_redis_password@your-redis-host:6379/0
```

## 🔍 Health Checks

The production launch script automatically verifies:

### Prerequisites
- ✅ Production environment file exists
- ✅ Node.js version compatibility
- ✅ Dependencies installed
- ✅ Frontend built successfully

### Runtime Health
- ✅ Backend API responding
- ✅ Frontend serving
- ✅ Database connectivity
- ✅ Redis connectivity (if configured)

## 📊 Monitoring & Logs

### Console Output
The launch script provides colored, timestamped logs:
- 🔵 **INFO**: General information
- 🟢 **SUCCESS**: Successful operations
- 🟡 **WARNING**: Non-critical issues
- 🔴 **ERROR**: Critical errors

### Process Management
- All processes are managed gracefully
- Ctrl+C triggers graceful shutdown
- Automatic cleanup on errors

## 🚦 Deployment Workflow

### Step 1: Preparation
```bash
# Check everything is ready
npm run deploy:check

# Install dependencies if needed
npm install
cd server && npm install
```

### Step 2: Configuration
```bash
# Set up production environment
cp server/.env.example server/.env.production
# Edit server/.env.production with your values
```

### Step 3: Launch
```bash
# Full production launch
npm start
```

### Step 4: Verification
```bash
# Test the services
curl http://localhost:5000/health
curl http://localhost:3000
```

## 🛠️ Troubleshooting

### Common Issues

#### "Prerequisites failed"
```bash
# Fix missing dependencies
npm install
cd server && npm install

# Fix missing environment file
cp server/.env.example server/.env.production
```

#### "Frontend build failed"
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.cache
npm run build:production
```

#### "Backend startup timeout"
```bash
# Check database connection
MONGODB_URI="your_connection_string" node scripts/setup-atlas-security.js test

# Check environment variables
cd server && npm run dev
```

#### "Port already in use"
```bash
# Kill processes on ports 3000 and 5000
npx kill-port 3000
npx kill-port 5000
```

### Debug Mode
For detailed debugging, run components separately:

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Frontend (after build)
npm run start:frontend
```

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use strong, unique JWT secrets
- [ ] Configure MongoDB Atlas IP whitelist
- [ ] Use HTTPS in production
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Regular security audits

### Environment Security
```bash
# Generate secure passwords
npm run security:generate-password

# Run security audit
npm run security:atlas
```

## 📈 Performance Optimization

### Build Optimization
The production build includes:
- Code minification
- Asset optimization
- Bundle splitting
- PWA generation

### Runtime Optimization
- Frontend served with compression
- Backend API with rate limiting
- Database connection pooling
- Redis caching (if configured)

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy SINGGLEBEE
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd server && npm install
      
      - name: Build and test
        run: |
          npm run deploy:check
          npm run deploy:build
      
      - name: Deploy
        run: npm start
```

## 📞 Support

### Getting Help
1. Check this guide first
2. Review console logs
3. Run health checks: `npm run deploy:check`
4. Check security: `npm run security:atlas`

### Emergency Procedures
- Graceful shutdown: Ctrl+C
- Force kill: `pkill -f "node.*production-launch"`
- Reset environment: Delete `server/.env.production` and recreate

---

**🎯 Your SINGGLEBEE e-commerce platform is now ready for production!**

**Last Updated**: March 2026
**Version**: 1.0
