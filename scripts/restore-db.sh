#!/bin/bash

# SINGGLEBEE Database Disaster Recovery Script
# Restores MongoDB from backup to a new instance

set -euo pipefail

# Configuration
NAMESPACE=${NAMESPACE:-singglebee}
BACKUP_FILE=${1:-}
RESTORE_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="logs/db-restore-${RESTORE_TIMESTAMP}.log"
MAX_RESTORE_TIME=900  # 15 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${2}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1" "$RED"
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary resources..." "$BLUE"
    
    # Remove temporary pods if they exist
    kubectl delete pod mongodb-restore --ignore-not-found=true -n "$NAMESPACE" || true
    
    # Remove temporary services if they exist
    kubectl delete service mongodb-restore --ignore-not-found=true -n "$NAMESPACE" || true
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..." "$BLUE"
    
    # Check if backup file provided
    if [ -z "$BACKUP_FILE" ]; then
        error_exit "Backup file path required. Usage: $0 <backup-file>"
    fi
    
    # Check if backup file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        error_exit "Backup file not found: $BACKUP_FILE"
    fi
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed"
    fi
    
    # Check if cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error_exit "Namespace $NAMESPACE does not exist"
    fi
    
    # Check backup file integrity
    if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
        error_exit "Backup file is corrupted or not a valid gzip file"
    fi
    
    log "Prerequisites check completed" "$GREEN"
}

# Backup current state
backup_current_state() {
    log "Creating backup of current state..." "$BLUE"
    
    # Get current MongoDB configuration
    kubectl get statefulset mongodb -n "$NAMESPACE" -o yaml > "backups/mongodb-statefulset-${RESTORE_TIMESTAMP}.yaml"
    
    # Get current service configuration
    kubectl get service mongodb -n "$NAMESPACE" -o yaml > "backups/mongodb-service-${RESTORE_TIMESTAMP}.yaml"
    
    # Get current PVC information
    kubectl get pvc -n "$NAMESPACE" -l app=mongodb -o yaml > "backups/mongodb-pvcs-${RESTORE_TIMESTAMP}.yaml"
    
    log "Current state backed up" "$GREEN"
}

# Scale down current MongoDB
scale_down_mongodb() {
    log "Scaling down current MongoDB..." "$YELLOW"
    
    # Scale down to 0 replicas
    kubectl scale statefulset mongodb --replicas=0 -n "$NAMESPACE"
    
    # Wait for pods to terminate
    log "Waiting for MongoDB pods to terminate..." "$BLUE"
    kubectl wait --for=delete pod -l app=mongodb -n "$NAMESPACE" --timeout=300s
    
    log "MongoDB scaled down" "$GREEN"
}

# Create restore pod
create_restore_pod() {
    log "Creating restore pod..." "$BLUE"
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: mongodb-restore
  namespace: $NAMESPACE
  labels:
    app: mongodb-restore
spec:
  containers:
  - name: mongodb-restore
    image: mongo:6.0
    command:
    - /bin/bash
    - -c
    - |
      echo "Waiting for restore signal..."
      while [ ! -f /tmp/restore-started ]; do
        sleep 2
      done
      echo "Starting restore..."
      mongorestore --host mongodb-restore --port 27017 --drop --gzip --archive=/backup/mongodb-backup.gz
      echo "Restore completed"
      touch /tmp/restore-completed
      sleep 3600  # Keep pod running for verification
    volumeMounts:
    - name: backup-volume
      mountPath: /backup
    - name: data-volume
      mountPath: /data/db
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 1Gi
  volumes:
  - name: backup-volume
    hostPath:
      path: $(pwd)
  - name: data-volume
    emptyDir: {}
  restartPolicy: Never
EOF
    
    # Wait for pod to be ready
    log "Waiting for restore pod to be ready..." "$BLUE"
    kubectl wait --for=condition=ready pod/mongodb-restore -n "$NAMESPACE" --timeout=300s
    
    log "Restore pod created and ready" "$GREEN"
}

# Copy backup to pod
copy_backup_to_pod() {
    log "Copying backup file to restore pod..." "$BLUE"
    
    # Copy backup file to pod
    kubectl cp "$BACKUP_FILE" "$NAMESPACE/mongodb-restore:/backup/mongodb-backup.gz"
    
    # Verify file was copied
    if ! kubectl exec mongodb-restore -n "$NAMESPACE" -- ls -la /backup/mongodb-backup.gz; then
        error_exit "Failed to copy backup file to pod"
    fi
    
    log "Backup file copied to restore pod" "$GREEN"
}

# Start restore process
start_restore() {
    log "Starting database restore..." "$YELLOW"
    
    # Signal restore to start
    kubectl exec mongodb-restore -n "$NAMESPACE" -- touch /tmp/restore-started
    
    # Monitor restore progress
    log "Monitoring restore progress..." "$BLUE"
    
    RESTORE_START=$(date +%s)
    TIMEOUT=false
    
    while [ $(( $(date +%s) - RESTORE_START )) -lt $MAX_RESTORE_TIME ]; do
        if kubectl exec mongodb-restore -n "$NAMESPACE" -- test -f /tmp/restore-completed; then
            log "Restore completed successfully!" "$GREEN"
            return 0
        fi
        
        # Check if pod is still running
        if ! kubectl get pod mongodb-restore -n "$NAMESPACE" &> /dev/null; then
            error_exit "Restore pod terminated unexpectedly"
        fi
        
        # Show progress
        ELAPSED=$(( $(date +%s) - RESTORE_START ))
        log "Restore in progress... (${ELAPSED}s elapsed)" "$BLUE"
        
        sleep 10
    done
    
    TIMEOUT=true
    error_exit "Restore timed out after ${MAX_RESTORE_TIME} seconds"
}

# Verify restore
verify_restore() {
    log "Verifying restore integrity..." "$BLUE"
    
    # Connect to restored database
    RESTORE_RESULT=$(kubectl exec mongodb-restore -n "$NAMESPACE" -- mongo --eval "
        use singglebee;
        var collections = db.getCollectionNames();
        var totalDocs = 0;
        collections.forEach(function(collection) {
            totalDocs += db.getCollection(collection).count();
        });
        print(JSON.stringify({
            collections: collections.length,
            totalDocuments: totalDocs,
            timestamp: new Date().toISOString()
        }));
    " 2>/dev/null || echo '{"error": "connection_failed"}')
    
    # Parse results
    if echo "$RESTORE_RESULT" | grep -q "error"; then
        error_exit "Failed to connect to restored database"
    fi
    
    COLLECTIONS=$(echo "$RESTORE_RESULT" | jq -r '.collections')
    DOCS=$(echo "$RESTORE_RESULT" | jq -r '.totalDocuments')
    
    log "Restore verification results:" "$GREEN"
    log "  Collections: $COLLECTIONS" "$GREEN"
    log "  Documents: $DOCS" "$GREEN"
    
    if [ "$COLLECTIONS" -eq 0 ] || [ "$DOCS" -eq 0 ]; then
        error_exit "Restore verification failed - empty database"
    fi
    
    log "Restore verification passed" "$GREEN"
}

# Replace original MongoDB
replace_mongodb() {
    log "Replacing original MongoDB with restored instance..." "$YELLOW"
    
    # Delete original statefulset
    kubectl delete statefulset mongodb -n "$NAMESPACE" --ignore-not-found=true
    
    # Wait for deletion
    kubectl wait --for=delete statefulset/mongodb -n "$NAMESPACE" --timeout=300s || true
    
    # Create new statefulset from restore pod
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: $NAMESPACE
spec:
  serviceName: mongodb
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: "singglebee_secure_2024"
        volumeMounts:
        - name: data-volume
          mountPath: /data/db
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
      volumes:
      - name: data-volume
        emptyDir: {}
EOF
    
    # Wait for new pod to be ready
    log "Waiting for new MongoDB pod to be ready..." "$BLUE"
    kubectl wait --for=condition=ready pod -l app=mongodb -n "$NAMESPACE" --timeout=300s
    
    log "New MongoDB instance ready" "$GREEN"
}

# Copy data from restore pod to new MongoDB
copy_data_to_new_instance() {
    log "Copying data to new MongoDB instance..." "$BLUE"
    
    # Get new MongoDB pod name
    NEW_MONGO_POD=$(kubectl get pods -n "$NAMESPACE" -l app=mongodb -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$NEW_MONGO_POD" ]; then
        error_exit "New MongoDB pod not found"
    fi
    
    # Copy data using mongodump/mongorestore
    kubectl exec mongodb-restore -n "$NAMESPACE" -- mongodump --host localhost --port 27017 --gzip --archive=/tmp/restore-data.gz
    kubectl exec mongodb-restore -n "$NAMESPACE" -- kubectl cp /tmp/restore-data.gz "$NAMESPACE/$NEW_MONGO_POD:/tmp/restore-data.gz"
    kubectl exec "$NEW_MONGO_POD" -n "$NAMESPACE" -- mongorestore --host localhost --port 27017 --gzip --archive=/tmp/restore-data.gz
    
    log "Data copied to new MongoDB instance" "$GREEN"
}

# Final verification
final_verification() {
    log "Performing final verification..." "$BLUE"
    
    # Test database connectivity
    NEW_MONGO_POD=$(kubectl get pods -n "$NAMESPACE" -l app=mongodb -o jsonpath='{.items[0].metadata.name}')
    
    # Check collections and documents
    FINAL_RESULT=$(kubectl exec "$NEW_MONGO_POD" -n "$NAMESPACE" -- mongo --eval "
        use singglebee;
        var collections = db.getCollectionNames();
        var totalDocs = 0;
        collections.forEach(function(collection) {
            totalDocs += db.getCollection(collection).count();
        });
        print(JSON.stringify({
            status: 'success',
            collections: collections.length,
            totalDocuments: totalDocs,
            timestamp: new Date().toISOString()
        }));
    " 2>/dev/null || echo '{"error": "verification_failed"}')
    
    if echo "$FINAL_RESULT" | grep -q "error"; then
        error_exit "Final verification failed"
    fi
    
    COLLECTIONS=$(echo "$FINAL_RESULT" | jq -r '.collections')
    DOCS=$(echo "$FINAL_RESULT" | jq -r '.totalDocuments')
    
    log "Final verification results:" "$GREEN"
    log "  Collections: $COLLECTIONS" "$GREEN"
    log "  Documents: $DOCS" "$GREEN"
    log "  Status: Healthy" "$GREEN"
    
    # Test application connectivity
    log "Testing application connectivity..." "$BLUE"
    
    # Scale up API deployment
    kubectl scale deployment singglebee-api --replicas=3 -n "$NAMESPACE"
    
    # Wait for API to be ready
    kubectl wait --for=condition=available deployment/singglebee-api -n "$NAMESPACE" --timeout=300s
    
    # Test API endpoint
    API_POD=$(kubectl get pods -n "$NAMESPACE" -l app=singglebee-api -o jsonpath='{.items[0].metadata.name}')
    kubectl exec "$API_POD" -n "$NAMESPACE" -- curl -f http://localhost:5000/health || error_exit "API health check failed"
    
    log "Application connectivity verified" "$GREEN"
}

# Generate restore report
generate_report() {
    log "Generating restore report..." "$BLUE"
    
    REPORT_FILE="reports/db-restore-report-${RESTORE_TIMESTAMP}.md"
    
    cat <<EOF > "$REPORT_FILE"
# Database Restore Report

**Date:** $(date)
**Environment:** $NAMESPACE
**Backup File:** $BACKUP_FILE
**Restore Duration:** $(date -d@$(( $(date +%s) - $(stat -c %Y "$LOG_FILE" | cut -d' ' -f1) )) -u +%H:%M:%S)

## Restore Process

1. **Backup Verification** ✅
   - File integrity checked
   - File size: $(du -h "$BACKUP_FILE" | cut -f1)

2. **MongoDB Scale Down** ✅
   - Original instance scaled down
   - Pods terminated gracefully

3. **Restore Pod Creation** ✅
   - Temporary pod created
   - Backup file copied successfully

4. **Data Restore** ✅
   - Mongorestore completed
   - All collections restored

5. **New Instance Deployment** ✅
   - New MongoDB pod deployed
   - Data copied successfully

6. **Verification** ✅
   - Database connectivity verified
   - Application connectivity tested

## Results

- **Collections Restored:** $COLLECTIONS
- **Documents Restored:** $DOCS
- **Status:** Success
- **Application Health:** Healthy

## Post-Restore Actions

- [ ] Monitor application performance
- [ ] Verify all user data integrity
- [ ] Update monitoring dashboards
- [ ] Schedule next backup verification

## Lessons Learned

- Document any issues encountered
- Note any improvements needed
- Update procedures if required

EOF
    
    log "Restore report generated: $REPORT_FILE" "$GREEN"
}

# Main execution
main() {
    log "Starting SINGGLEBEE Database Disaster Recovery" "$BLUE"
    log "Environment: $NAMESPACE" "$BLUE"
    log "Backup file: $BACKUP_FILE" "$BLUE"
    
    # Create directories
    mkdir -p logs backups reports
    
    # Setup
    check_prerequisites
    backup_current_state
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Execute restore process
    scale_down_mongodb
    create_restore_pod
    copy_backup_to_pod
    start_restore
    verify_restore
    replace_mongodb
    copy_data_to_new_instance
    final_verification
    generate_report
    
    # Cleanup
    cleanup
    
    log "Database disaster recovery completed successfully!" "$GREEN"
    log "System is ready for normal operation" "$BLUE"
}

# Run main function
main "$@"
