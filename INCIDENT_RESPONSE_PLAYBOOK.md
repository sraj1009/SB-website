# SINGGLEBEE Incident Response Playbook

**Version:** 1.0  
**Last Updated:** 2024-03-10  
**Owner:** SRE Team  

## 🚨 Incident Severity Levels

| Severity | Definition | Response Time | Resolution Time |
|----------|-------------|----------------|------------------|
| **SEV-0** | Complete outage, revenue loss > $10K/hr | 5 minutes | 1 hour |
| **SEV-1** | Major feature down, revenue loss > $1K/hr | 15 minutes | 4 hours |
| **SEV-2** | Partial degradation, user impact > 25% | 30 minutes | 8 hours |
| **SEV-3** | Minor issues, user impact < 25% | 2 hours | 24 hours |
| **SEV-4** | Cosmetic issues, no user impact | 24 hours | 72 hours |

## 📞 On-Call Escalation Policy

### Primary On-Call (24/7)
- **Page:** +1-XXX-XXX-XXXX
- **Slack:** @oncall-sre
- **Response Time:** 5 minutes (SEV-0), 15 minutes (SEV-1)

### Escalation Chain
1. **Primary On-Call** → 15 min
2. **Secondary On-Call** → 30 min  
3. **SRE Lead** → 45 min
4. **Engineering Director** → 60 min
5. **CTO** → 90 min

## 🎯 Top 5 Failure Scenarios

### 1. Database Outage (SEV-0)
**Trigger:** MongoDB connection failures, high latency, replica set issues

#### Detection
- Alert: `mongodb_up == 0`
- Alert: `mongodb_connection_time > 1000ms`
- Alert: `database_errors > 10/min`
- Dashboard: Database health check failing

#### Immediate Actions (0-5 min)
1. **Declare incident** in Slack #incidents
2. **Check MongoDB status**:
   ```bash
   kubectl get pods -n singglebee -l app=mongodb
   kubectl logs -f mongodb-0 -n singglebee
   ```
3. **Verify replica set health**:
   ```bash
   kubectl exec mongodb-0 -n singglebee -- mongo --eval "rs.status()"
   ```
4. **Enable read mode** if write operations failing:
   ```bash
   # Update feature flag
   kubectl exec -it api-pod -- node scripts/emergency-disable.js database-writes
   ```

#### Investigation (5-15 min)
1. **Check resource usage**:
   ```bash
   kubectl top pods -n singglebee -l app=mongodb
   kubectl describe pod mongodb-0 -n singglebee
   ```
2. **Review recent changes**:
   - Database schema migrations
   - Index modifications
   - Configuration updates
3. **Check network connectivity**:
   ```bash
   kubectl exec api-pod -- ping mongodb-service
   ```

#### Resolution (15-60 min)
1. **Restart MongoDB primary** if unresponsive:
   ```bash
   kubectl delete pod mongodb-0 -n singglebee --force
   ```
2. **Scale up replicas** if needed:
   ```bash
   kubectl scale statefulset mongodb --replicas=3 -n singglebee
   ```
3. **Restore from backup** as last resort:
   ```bash
   ./scripts/restore-db.sh backup-20240310-1200
   ```

#### Post-Incident
- Root cause analysis (RCA) within 24 hours
- Update database monitoring thresholds
- Review backup restoration procedures

---

### 2. Payment Gateway Failure (SEV-1)
**Trigger:** Cashfree/Razorpay API failures, payment processing errors

#### Detection
- Alert: `payment_success_rate < 95%`
- Alert: `payment_gateway_errors > 5/min`
- Alert: `revenue_impact > $100/hr`

#### Immediate Actions (0-5 min)
1. **Check payment gateway status**:
   ```bash
   curl -I https://api.cashfree.com/health
   curl -I https://api.razorpay.com/v1/health
   ```
2. **Switch to backup gateway**:
   ```bash
   # Update feature flag
   kubectl exec -it api-pod -- node scripts/switch-payment-gateway.js razorpay
   ```
3. **Notify finance team** of potential revenue impact

#### Investigation (5-15 min)
1. **Review error logs**:
   ```bash
   kubectl logs -f deployment/singglebee-api -n singglebee | grep "payment"
   ```
2. **Check API rate limits** and quotas
3. **Verify webhook signatures** and callbacks

#### Resolution (15-60 min)
1. **Implement circuit breaker** for failing gateway
2. **Enable manual payment verification** if needed
3. **Update status page** for customers

#### Post-Incident
- Review payment gateway SLAs
- Implement multi-gateway load balancing
- Add payment retry logic with exponential backoff

---

### 3. High CPU/Memory Usage (SEV-2)
**Trigger:** Container resource exhaustion, performance degradation

#### Detection
- Alert: `cpu_usage > 80% for 5min`
- Alert: `memory_usage > 85% for 5min`
- Alert: `response_time_p95 > 500ms`

#### Immediate Actions (0-5 min)
1. **Identify affected pods**:
   ```bash
   kubectl top pods -n singglebee --sort-by=cpu
   kubectl top pods -n singglebee --sort-by=memory
   ```
2. **Scale out horizontally**:
   ```bash
   kubectl scale deployment singglebee-api --replicas=10 -n singglebee
   ```
3. **Check for memory leaks** in recent deployments

#### Investigation (5-15 min)
1. **Analyze pod metrics**:
   ```bash
   kubectl exec -it api-pod -- top
   kubectl exec -it api-pod -- ps aux
   ```
2. **Review recent code changes** and deployments
3. **Check database query performance**

#### Resolution (15-60 min)
1. **Rollback recent deployment** if needed:
   ```bash
   kubectl rollout undo deployment/singglebee-api -n singglebee
   ```
2. **Optimize resource limits** and requests
3. **Enable auto-scaling** if not already active

#### Post-Incident
- Update resource allocation policies
- Implement performance monitoring
- Review deployment procedures

---

### 4. SSL/TLS Certificate Expiry (SEV-0)
**Trigger:** Certificate expiring soon or expired

#### Detection
- Alert: `ssl_certificate_expiry < 7 days`
- Alert: `ssl_handshake_errors > 0`

#### Immediate Actions (0-5 min)
1. **Check certificate status**:
   ```bash
   openssl s_client -connect singglebee.com:443 -servername singglebee.com
   ```
2. **Deploy emergency certificate** if expired:
   ```bash
   kubectl apply -f k8s/emergency-cert.yaml
   ```
3. **Update DNS** to point to working endpoint

#### Investigation (5-15 min)
1. **Review certificate renewal process**
2. **Check automation scripts** and cron jobs
3. **Verify certificate authority** status

#### Resolution (15-60 min)
1. **Renew certificate** with Let's Encrypt:
   ```bash
   certbot renew --force-renewal
   kubectl create secret tls singglebee-tls --cert=fullchain.pem --key=privkey.pem
   ```
2. **Update ingress** with new certificate
3. **Test SSL configuration**:
   ```bash
   curl -I https://singglebee.com
   ```

#### Post-Incident
- Implement certificate monitoring
- Automate renewal process
- Add multiple certificate authorities

---

### 5. Cache/Memory Store Failure (SEV-1)
**Trigger:** Redis failures, session loss, cache misses

#### Detection
- Alert: `redis_up == 0`
- Alert: `cache_miss_rate > 50%`
- Alert: `session_errors > 10/min`

#### Immediate Actions (0-5 min)
1. **Check Redis status**:
   ```bash
   kubectl get pods -n singglebee -l app=redis
   kubectl exec -it redis-master -- redis-cli ping
   ```
2. **Enable fallback mode**:
   ```bash
   # Update feature flag to disable caching
   kubectl exec -it api-pod -- node scripts/emergency-disable.js redis-cache
   ```
3. **Restart Redis** if needed:
   ```bash
   kubectl delete pod redis-master -n singglebee
   ```

#### Investigation (5-15 min)
1. **Check Redis memory usage**:
   ```bash
   kubectl exec redis-master -- redis-cli info memory
   ```
2. **Review recent cache operations**
3. **Check network connectivity** between API and Redis

#### Resolution (15-60 min)
1. **Scale Redis cluster**:
   ```bash
   kubectl scale statefulset redis --replicas=3 -n singglebee
   ```
2. **Implement cache warming** procedures
3. **Add Redis monitoring** and alerts

#### Post-Incident
- Review Redis configuration
- Implement cache backup strategies
- Add multi-AZ Redis deployment

---

## 🛠️ General Incident Procedures

### Incident Declaration
1. **Create incident channel**: `#incident-YYYY-MM-DD-HH`
2. **Assign severity level** based on impact
3. **Notify stakeholders** via PagerDuty/Slack
4. **Start incident timer** for SLA tracking

### Communication Templates

#### Initial Alert (SEV-0/1)
```
🚨 SEV-{X} INCIDENT DECLARED 🚨

Service: SINGGLEBEE API
Impact: {Brief description of user impact}
Started: {Timestamp}
On-call: {Name}

Investigation in progress. Updates in 15 minutes.
Status Page: https://status.singglebee.com
```

#### Progress Update (Every 15-30 min)
```
📊 INCIDENT UPDATE - SEV-{X}

Time Elapsed: {X minutes}
Current Status: {Investigating/Mitigating/Monitoring}
Impact: {Current user impact}
Next Update: {Timestamp}

Key Findings:
- {Finding 1}
- {Finding 2}

Actions Taken:
- {Action 1}
- {Action 2}
```

#### Resolution
```
✅ INCIDENT RESOLVED - SEV-{X}

Duration: {X minutes}
Root Cause: {Brief description}
Impact: {Final impact assessment}
Resolution: {What fixed it}

Post-mortem scheduled: {Date/Time}
Follow-up actions: {List of improvements}
```

### Post-Incident Process

#### Immediate (0-2 hours)
1. **Verify service stability**
2. **Update status page** to "All Systems Operational"
3. **Send resolution notification**

#### Short-term (24 hours)
1. **Write incident report** with timeline
2. **Schedule post-mortem meeting**
3. **Identify improvement actions**

#### Long-term (1 week)
1. **Implement monitoring improvements**
2. **Update playbooks** with lessons learned
3. **Train team** on new procedures

## 📋 Checklists

### Pre-Deployment Checklist
- [ ] Database backups verified
- [ ] Feature flags ready for rollback
- [ ] Monitoring dashboards updated
- [ ] Rollback plan documented
- [ ] Team notified of deployment

### Incident Response Checklist
- [ ] Incident channel created
- [ ] Severity assigned
- [ ] Stakeholders notified
- [ ] Timeline started
- [ ] Root cause investigation begun
- [ ] Mitigation implemented
- [ ] Service restored
- [ ] Post-mortem scheduled

## 🔧 Tools and Commands

### Monitoring
```bash
# Check pod status
kubectl get pods -n singglebee

# Check resource usage
kubectl top pods -n singglebee

# Check logs
kubectl logs -f deployment/singglebee-api -n singglebee

# Check events
kubectl get events -n singglebee --sort-by='.lastTimestamp'
```

### Debugging
```bash
# Port forward to local
kubectl port-forward svc/singglebee-api 5000:5000 -n singglebee

# Exec into pod
kubectl exec -it deployment/singglebee-api -n singglebee -- bash

# Check network connectivity
kubectl exec -it api-pod -- curl -I http://localhost:5000/health
```

### Emergency Commands
```bash
# Scale up
kubectl scale deployment singglebee-api --replicas=10 -n singglebee

# Rollback
kubectl rollout undo deployment/singglebee-api -n singglebee

# Restart
kubectl rollout restart deployment/singglebee-api -n singglebee

# Emergency disable feature
kubectl exec -it api-pod -- node scripts/emergency-disable.js feature-name
```

## 📞 Contacts

### Internal
- **SRE Team:** @sre-team
- **Engineering:** @engineering-team
- **Product:** @product-team
- **Support:** @customer-support

### External
- **Cloud Provider:** AWS Support - 1-800-AWS-HELP
- **Payment Gateway:** Cashfree Support - support@cashfree.com
- **CDN Provider:** Cloudflare Support - support@cloudflare.com
- **DNS Provider:** Route53 Support - AWS Console

## 📚 Documentation Links

- [Runbooks](./runbooks/)
- [Architecture Diagrams](./architecture/)
- [Monitoring Dashboards](https://grafana.singglebee.com)
- [Status Page](https://status.singglebee.com)
- [Emergency Contacts](./contacts.md)

---

**Remember:** Stay calm, communicate clearly, and focus on customer impact first. The goal is to restore service quickly while gathering information for permanent fixes.
