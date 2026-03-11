# MongoDB Atlas Security Quick Start Guide

## 🚀 Immediate Action Items (Do These Now)

### 1. Create Secure Database User
```bash
# Generate a secure password
npm run security:generate-password

# Example output: 🔐 Generated secure password: Xk9@mN2$pQ8#rT5!wE7*vB3
```

**In Atlas Dashboard → Database Access:**
1. Click "Add New Database User"
2. Username: `singglebee_app`
3. Password: Use the generated password above
4. Authentication Method: SCRAM
5. Database User Privileges: Read and Write to any database
6. Click "Add User"

### 2. Configure IP Whitelist
**In Atlas Dashboard → Network Access:**

**For Development:**
1. Click "Add IP Address"
2. Select "Add Current IP Address"
3. Name: `SINGGLEBEE-Dev-Office`
4. Click "Confirm"

**For Production:**
1. Add your server's static IP
2. Name: `SINGGLEBEE-Prod-Server`
3. **NEVER** use `0.0.0.0/0` for production

### 3. Update Connection Strings

**Update `.env.production`:**
```env
# Replace with your actual values
MONGODB_URI=mongodb+srv://singglebee_app:GENERATED_PASSWORD@cluster.mongodb.net/singglebee-prod?retryWrites=true&w=majority&ssl=true&authSource=admin
```

**Update `.env.staging`:**
```env
# Replace with your actual values
MONGODB_URI=mongodb+srv://singglebee_staging:STAGING_PASSWORD@cluster.mongodb.net/singglebee-staging?retryWrites=true&w=majority&ssl=true&authSource=admin
```

### 4. Test Security Configuration
```bash
# Test production connection
MONGODB_URI="mongodb+srv://singglebee_app:PASSWORD@cluster.mongodb.net/singglebee-prod?retryWrites=true&w=majority&ssl=true&authSource=admin" npm run test:atlas

# Run full security audit
npm run security:atlas
```

## ⚡ 5-Minute Security Checklist

- [ ] **Database User Created**: `singglebee_app` with strong password
- [ ] **IP Whitelist Configured**: Current IP for dev, server IP for prod
- [ ] **Connection String Updated**: Using `singglebee_app` user
- [ ] **SSL Enabled**: Connection string includes `ssl=true`
- [ ] **No 0.0.0.0/0**: Production doesn't allow all IPs
- [ ] **Connection Tested**: Run `npm run test:atlas`

## 📋 Detailed Security Tasks

### High Priority (Complete Today)
1. ✅ Create dedicated database user
2. ✅ Configure IP whitelist
3. ✅ Update production connection string
4. ✅ Test database connection
5. ✅ Enable Atlas monitoring

### Medium Priority (This Week)
1. Enable automated backups
2. Set up alert notifications
3. Review audit logs (M10+ clusters)
4. Test backup restore procedure

### Low Priority (Next Sprint)
1. Configure VPC peering (advanced)
2. Set up private endpoints (M10+)
3. Enable performance monitoring
4. Document security procedures

## 🔧 Common Issues & Solutions

### Connection Refused
**Problem**: `Connection refused`
**Solution**: Check IP whitelist includes your current IP

### Authentication Failed
**Problem**: `Authentication failed`
**Solution**: Verify username/password and authSource=admin

### SSL Certificate Error
**Problem**: SSL certificate issues
**Solution**: Ensure using `mongodb+srv://` protocol

### Timeout Issues
**Problem**: Connection timeout
**Solution**: Check network connectivity and firewall settings

## 📞 Support & Resources

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Security Guide**: `MONGODB_ATLAS_SECURITY.md`
- **Security Script**: `npm run security:atlas`
- **Emergency Support**: Available 24/7 for M10+ clusters

## 🔄 Regular Maintenance

### Monthly
- Review IP whitelist entries
- Check for unused database users
- Update passwords if needed

### Quarterly
- Rotate database passwords
- Review security settings
- Update Atlas cluster version

### Annually
- Full security audit
- Compliance review
- Disaster recovery testing

---

**⚠️ Important**: Never commit actual passwords to version control. Always use environment variables for sensitive data.
