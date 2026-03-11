# MongoDB Atlas Security Hardening Guide

## Overview
This guide provides step-by-step instructions to secure your MongoDB Atlas instance for the SINGGLEBEE e-commerce platform.

## 1. IP Whitelisting

### Development Environment
1. Go to Atlas Dashboard → Network Access
2. Click "Add IP Address"
3. Select "Add Current IP Address"
4. Add a descriptive name like "SINGGLEBEE-Dev-Office"
5. Click "Confirm"

### Production Environment
1. Go to Atlas Dashboard → Network Access
2. Add your server's static IP addresses:
   - AWS EC2 instance IP
   - Heroku dyno IPs (if using Heroku)
   - DigitalOcean droplet IP
   - Any other server IPs
3. **NEVER** use `0.0.0.0/0` (Allow from anywhere) in production
4. Use descriptive names for each IP entry

## 2. Database User Security

### Create Dedicated Application User
1. Go to Atlas Dashboard → Database Access
2. Click "Add New Database User"
3. Fill in the details:
   - **Username**: `singglebee_app`
   - **Password**: Generate a strong password (use a password manager)
   - **Authentication Method**: SCRAM
4. **Database User Privileges**:
   - Select "Read and Write to any database"
   - OR specify specific database: `singglebee` with Read/Write
5. Click "Add User"

### User Permissions Matrix
| User | Purpose | Permissions | Environment |
|------|---------|-------------|-------------|
| `singglebee_app` | Application connection | Read/Write on singglebee DB | Both |
| `admin` | Administrative tasks | Full admin access | Development only |
| `readonly_user` | Analytics/Reporting | Read-only on singglebee DB | Production |

## 3. SSL/TLS Configuration

### Atlas SSL (Default Enabled)
MongoDB Atlas enforces SSL by default. Ensure your connection string includes SSL parameters:

```javascript
// Development (Local MongoDB - for testing only)
MONGODB_URI=mongodb://localhost:27017/singglebee

// Production (Atlas with SSL)
MONGODB_URI=mongodb+srv://singglebee_app:PASSWORD@cluster.mongodb.net/singglebee-prod?retryWrites=true&w=majority&ssl=true&authSource=admin
```

### SSL Parameters Explained
- `ssl=true`: Enforces SSL connection
- `retryWrites=true`: Enables retryable writes
- `w=majority`: Ensures write acknowledgment
- `authSource=admin`: Specifies authentication database

## 4. Network Security Best Practices

### VPC Peering (Optional - Advanced)
1. Set up VPC peering between your cloud provider and Atlas
2. Use private IP ranges instead of public IPs
3. Reduces attack surface significantly

### Private Endpoint (Optional - Advanced)
1. Configure private endpoints for enhanced security
2. Access Atlas without using public internet
3. Available on M10+ clusters

## 5. Monitoring and Auditing

### Enable Atlas Monitoring
1. Go to Atlas Dashboard → Monitoring
2. Enable performance monitoring
3. Set up alerts for:
   - High connection counts
   - Slow queries
   - Authentication failures
   - Network anomalies

### Audit Logs (Available in M10+)
1. Enable audit logging in Atlas settings
2. Monitor:
   - Authentication attempts
   - Database access patterns
   - Administrative actions
   - Failed operations

## 6. Backup and Recovery

### Automated Backups
1. Go to Atlas Dashboard → Backup
2. Enable automated backups
3. Set retention period (minimum 7 days, recommended 30 days)
4. Test restore procedures regularly

### Point-in-Time Recovery
1. Enable point-in-time recovery for critical data
2. Allows restoration to any specific moment
3. Essential for e-commerce transaction data

## 7. Security Checklist

### Pre-Deployment Checklist
- [ ] IP whitelist configured (no 0.0.0.0/0)
- [ ] Dedicated application user created
- [ ] Strong password used for database user
- [ ] SSL/TLS verified in connection string
- [ ] Monitoring enabled
- [ ] Backup strategy configured
- [ ] Audit logs enabled (if available)
- [ ] Test connection from application server

### Ongoing Security Tasks
- [ ] Review IP whitelist monthly
- [ ] Rotate database passwords quarterly
- [ ] Monitor Atlas security alerts
- [ ] Update Atlas clusters regularly
- [ ] Review user permissions monthly

## 8. Connection String Examples

### Development (Local MongoDB)
```env
MONGODB_URI=mongodb://localhost:27017/singglebee
```

### Staging (Atlas)
```env
MONGODB_URI=mongodb+srv://singglebee_staging:PASSWORD@cluster.mongodb.net/singglebee-staging?retryWrites=true&w=majority
```

### Production (Atlas)
```env
MONGODB_URI=mongodb+srv://singglebee_app:STRONG_PASSWORD@cluster.mongodb.net/singglebee-prod?retryWrites=true&w=majority&ssl=true&authSource=admin
```

## 9. Emergency Procedures

### Compromised Credentials
1. Immediately change database user password
2. Review IP whitelist for unauthorized entries
3. Check audit logs for suspicious activity
4. Rotate all application secrets
5. Enable additional monitoring

### Connection Issues
1. Verify IP whitelist includes current server IP
2. Check database user permissions
3. Validate SSL certificate
4. Review Atlas service status

## 10. Compliance Considerations

### GDPR Compliance
- Enable audit logging
- Implement data retention policies
- Ensure data encryption in transit and at rest
- Regular security assessments

### PCI DSS (if handling payments)
- Use dedicated Atlas cluster
- Enable encryption everywhere
- Regular vulnerability scanning
- Strict access controls

## Contact Support
- MongoDB Atlas Support: https://docs.atlas.mongodb.com/support/
- Security Issues: security@mongodb.com
- Emergency: 24/7 support available for M10+ clusters

---

**Last Updated**: March 2026
**Version**: 1.0
**Next Review**: June 2026
