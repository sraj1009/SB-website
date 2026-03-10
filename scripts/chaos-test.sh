#!/bin/bash

# SINGGLEBEE Chaos Engineering Test Suite
# Tests system resilience by simulating real-world failures

set -euo pipefail

# Configuration
CHAOS_DURATION=${CHAOS_DURATION:-300}  # 5 minutes default
LOG_FILE="logs/chaos-test-$(date +%Y%m%d-%H%M%S).log"
METRICS_FILE="logs/chaos-metrics-$(date +%Y%m%d-%H%M%S).json"
NAMESPACE=${NAMESPACE:-singglebee}
ENVIRONMENT=${ENVIRONMENT:-staging}

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..." "$BLUE"
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log "ERROR: kubectl is not installed" "$RED"
        exit 1
    fi
    
    # Check if cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR: Cannot connect to Kubernetes cluster" "$RED"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "ERROR: Namespace $NAMESPACE does not exist" "$RED"
        exit 1
    fi
    
    # Check if monitoring tools are running
    if ! kubectl get pods -n monitoring -l app=prometheus &> /dev/null; then
        log "WARNING: Prometheus not found in monitoring namespace" "$YELLOW"
    fi
    
    log "Prerequisites check completed" "$GREEN"
}

# Backup current state
backup_state() {
    log "Creating backup of current state..." "$BLUE"
    
    # Backup deployment configurations
    kubectl get deployments -n "$NAMESPACE" -o yaml > "backups/deployments-$(date +%Y%m%d-%H%M%S).yaml"
    
    # Backup service configurations
    kubectl get services -n "$NAMESPACE" -o yaml > "backups/services-$(date +%Y%m%d-%H%M%S).yaml"
    
    # Record baseline metrics
    curl -s "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/query_range?query=up&start=$(date -d '-5 minutes' --iso-8601)&end=$(date --iso-8601)&step=30s" > "backups/baseline-metrics-$(date +%Y%m%d-%H%M%S).json"
    
    log "State backup completed" "$GREEN"
}

# Pod Chaos Tests
test_pod_failure() {
    log "Starting Pod Failure Test..." "$YELLOW"
    
    # Get list of running pods
    PODS=$(kubectl get pods -n "$NAMESPACE" -l app=singglebee-api -o jsonpath='{.items[*].metadata.name}')
    
    if [ -z "$PODS" ]; then
        log "No API pods found to test" "$YELLOW"
        return
    fi
    
    # Randomly select a pod to kill
    POD_TO_KILL=$(echo "$PODS" | tr ' ' '\n' | shuf | head -1)
    
    log "Deleting pod: $POD_TO_KILL" "$BLUE"
    
    # Record metrics before deletion
    BEFORE_TIME=$(date +%s)
    BEFORE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$NAMESPACE-api-service.$NAMESPACE.svc.cluster.local:5000/health" || echo "000")
    
    # Delete the pod
    kubectl delete pod "$POD_TO_KILL" -n "$NAMESPACE" --grace-period=0 --force
    
    # Monitor recovery
    RECOVERY_TIME=0
    MAX_RECOVERY_TIME=60
    while [ $RECOVERY_TIME -lt $MAX_RECOVERY_TIME ]; do
        CURRENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$NAMESPACE-api-service.$NAMESPACE.svc.cluster.local:5000/health" || echo "000")
        
        if [ "$CURRENT_STATUS" = "200" ]; then
            break
        fi
        
        sleep 2
        RECOVERY_TIME=$((RECOVERY_TIME + 2))
    done
    
    AFTER_TIME=$(date +%s)
    TOTAL_DOWNTIME=$((AFTER_TIME - BEFORE_TIME + RECOVERY_TIME))
    
    log "Pod recovery time: ${TOTAL_DOWNTIME}s" "$GREEN"
    
    # Record results
    echo "{\"test\": \"pod_failure\", \"pod\": \"$POD_TO_KILL\", \"recovery_time\": $TOTAL_DOWNTIME, \"status_before\": $BEFORE_STATUS, \"status_after\": $CURRENT_STATUS}" >> "$METRICS_FILE"
    
    if [ $TOTAL_DOWNTIME -gt 30 ]; then
        log "WARNING: Recovery time exceeded 30s threshold" "$YELLOW"
    else
        log "Pod failure test passed" "$GREEN"
    fi
}

# Network Latency Test
test_network_latency() {
    log "Starting Network Latency Test..." "$YELLOW"
    
    # Install chaos-mesh if not present
    if ! kubectl get pods -n chaos-mesh &> /dev/null; then
        log "Installing Chaos Mesh..." "$BLUE"
        kubectl apply -f https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/master/install.yaml
        sleep 30
    fi
    
    # Create network latency chaos
    cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-latency
  namespace: $NAMESPACE
spec:
  selector:
    labelSelectors:
      app: singglebee-api
  mode: one
  action: delay
  delay:
    latency: "500ms"
    correlation: "25"
    jitter: "100ms"
  duration: "${CHAOS_DURATION}s"
EOF
    
    # Test API response during latency
    LATENCY_TEST_RESULTS=()
    TEST_DURATION=60
    TEST_INTERVAL=5
    
    for ((i=0; i<$TEST_DURATION; i+=$TEST_INTERVAL)); do
        START_TIME=$(date +%s%3N)
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$NAMESPACE-api-service.$NAMESPACE.svc.cluster.local:5000/health" || echo "000")
        END_TIME=$(date +%s%3N)
        
        RESPONSE_TIME=$((END_TIME - START_TIME))
        LATENCY_TEST_RESULTS+=("$RESPONSE_TIME,$STATUS_CODE")
        
        sleep $TEST_INTERVAL
    done
    
    # Clean up chaos
    kubectl delete networkchaos network-latency -n "$NAMESPACE" --ignore-not-found=true
    
    # Calculate metrics
    TOTAL_TESTS=${#LATENCY_TEST_RESULTS[@]}
    SUCCESSFUL_TESTS=0
    TOTAL_RESPONSE_TIME=0
    MAX_RESPONSE_TIME=0
    
    for result in "${LATENCY_TEST_RESULTS[@]}"; do
        IFS=',' read -r response_time status_code <<< "$result"
        
        if [ "$status_code" = "200" ]; then
            SUCCESSFUL_TESTS=$((SUCCESSFUL_TESTS + 1))
            TOTAL_RESPONSE_TIME=$((TOTAL_RESPONSE_TIME + response_time))
        fi
        
        if [ $response_time -gt $MAX_RESPONSE_TIME ]; then
            MAX_RESPONSE_TIME=$response_time
        fi
    done
    
    SUCCESS_RATE=$((SUCCESSFUL_TESTS * 100 / TOTAL_TESTS))
    AVG_RESPONSE_TIME=$((TOTAL_RESPONSE_TIME / SUCCESSFUL_TESTS))
    
    log "Network latency test results:" "$BLUE"
    log "  Success rate: ${SUCCESS_RATE}%" "$GREEN"
    log "  Average response time: ${AVG_RESPONSE_TIME}ms" "$GREEN"
    log "  Max response time: ${MAX_RESPONSE_TIME}ms" "$GREEN"
    
    # Record results
    echo "{\"test\": \"network_latency\", \"success_rate\": $SUCCESS_RATE, \"avg_response_time\": $AVG_RESPONSE_TIME, \"max_response_time\": $MAX_RESPONSE_TIME}" >> "$METRICS_FILE"
    
    if [ $SUCCESS_RATE -lt 95 ]; then
        log "WARNING: Success rate below 95%" "$YELLOW"
    else
        log "Network latency test passed" "$GREEN"
    fi
}

# Database Connection Failure Test
test_database_failure() {
    log "Starting Database Failure Test..." "$YELLOW"
    
    # Scale down MongoDB to simulate database failure
    kubectl scale statefulset mongodb --replicas=0 -n "$NAMESPACE"
    
    # Monitor API behavior
    FAILURE_TEST_RESULTS=()
    TEST_DURATION=60
    TEST_INTERVAL=5
    DOWNTIME_START=0
    
    for ((i=0; i<$TEST_DURATION; i+=$TEST_INTERVAL)); do
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$NAMESPACE-api-service.$NAMESPACE.svc.cluster.local:5000/health" || echo "000")
        CURRENT_TIME=$(date +%s)
        
        if [ "$STATUS_CODE" != "200" ] && [ $DOWNTIME_START -eq 0 ]; then
            DOWNTIME_START=$CURRENT_TIME
        elif [ "$STATUS_CODE" = "200" ] && [ $DOWNTIME_START -ne 0 ]; then
            DOWNTIME_END=$CURRENT_TIME
            TOTAL_DOWNTIME=$((DOWNTIME_END - DOWNTIME_START))
            break
        fi
        
        FAILURE_TEST_RESULTS+=("$CURRENT_TIME,$STATUS_CODE")
        sleep $TEST_INTERVAL
    done
    
    # Restore MongoDB
    kubectl scale statefulset mongodb --replicas=1 -n "$NAMESPACE"
    
    # Wait for MongoDB to be ready
    kubectl wait --for=condition=ready pod -l app=mongodb -n "$NAMESPACE" --timeout=120s
    
    # Test API recovery
    RECOVERY_TIME=0
    MAX_RECOVERY_TIME=120
    
    while [ $RECOVERY_TIME -lt $MAX_RECOVERY_TIME ]; do
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$NAMESPACE-api-service.$NAMESPACE.svc.cluster.local:5000/health" || echo "000")
        
        if [ "$STATUS_CODE" = "200" ]; then
            break
        fi
        
        sleep 5
        RECOVERY_TIME=$((RECOVERY_TIME + 5))
    done
    
    log "Database failure test results:" "$BLUE"
    log "  Total downtime: ${TOTAL_DOWNTIME:-0}s" "$GREEN"
    log "  Recovery time: ${RECOVERY_TIME}s" "$GREEN"
    
    # Record results
    echo "{\"test\": \"database_failure\", \"downtime\": ${TOTAL_DOWNTIME:-0}, \"recovery_time\": $RECOVERY_TIME}" >> "$METRICS_FILE"
    
    if [ ${TOTAL_DOWNTIME:-0} -gt 30 ]; then
        log "WARNING: Database downtime exceeded 30s" "$YELLOW"
    else
        log "Database failure test passed" "$GREEN"
    fi
}

# Disk Space Exhaustion Test
test_disk_exhaustion() {
    log "Starting Disk Space Test..." "$YELLOW"
    
    # Find a pod to fill disk
    POD=$(kubectl get pods -n "$NAMESPACE" -l app=singglebee-api -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD" ]; then
        log "No API pods found for disk test" "$YELLOW"
        return
    fi
    
    # Create large file to simulate disk exhaustion
    kubectl exec "$POD" -n "$NAMESPACE" -- /bin/sh -c "dd if=/dev/zero of=/tmp/large-file bs=1M count=1024" || true
    
    # Monitor API behavior
    DISK_TEST_RESULTS=()
    TEST_DURATION=30
    TEST_INTERVAL=3
    
    for ((i=0; i<$TEST_DURATION; i+=$TEST_INTERVAL)); do
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$NAMESPACE-api-service.$NAMESPACE.svc.cluster.local:5000/health" || echo "000")
        DISK_TEST_RESULTS+=("$(date +%s),$STATUS_CODE")
        sleep $TEST_INTERVAL
    done
    
    # Clean up
    kubectl exec "$POD" -n "$NAMESPACE" -- rm -f /tmp/large-file || true
    
    # Check if pod recovered
    sleep 10
    RECOVERY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$NAMESPACE-api-service.$NAMESPACE.svc.cluster.local:5000/health" || echo "000")
    
    log "Disk space test results:" "$BLUE"
    log "  Recovery status: $RECOVERY_STATUS" "$GREEN"
    
    # Record results
    echo "{\"test\": \"disk_exhaustion\", \"recovery_status\": $RECOVERY_STATUS}" >> "$METRICS_FILE"
    
    if [ "$RECOVERY_STATUS" = "200" ]; then
        log "Disk space test passed" "$GREEN"
    else
        log "WARNING: System did not recover from disk exhaustion" "$YELLOW"
    fi
}

# Generate resilience report
generate_report() {
    log "Generating resilience report..." "$BLUE"
    
    REPORT_FILE="reports/resilience-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat <<EOF > "$REPORT_FILE"
# SINGGLEBEE Chaos Engineering Report

**Date:** $(date)
**Environment:** $ENVIRONMENT
**Namespace:** $NAMESPACE
**Test Duration:** ${CHAOS_DURATION}s

## Test Results

\`\`\`json
$(cat "$METRICS_FILE")
\`\`\`

## Summary

EOF
    
    # Add summary statistics
    if [ -f "$METRICS_FILE" ]; then
        TOTAL_TESTS=$(jq length "$METRICS_FILE")
        PASSED_TESTS=$(jq '[.[] | select(.recovery_time < 30 or .success_rate >= 95)] | length' "$METRICS_FILE")
        
        echo "- **Total Tests:** $TOTAL_TESTS" >> "$REPORT_FILE"
        echo "- **Passed Tests:** $PASSED_TESTS" >> "$REPORT_FILE"
        echo "- **Failed Tests:** $((TOTAL_TESTS - PASSED_TESTS))" >> "$REPORT_FILE"
        echo "- **Success Rate:** $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
    echo "## Recommendations" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Add recommendations based on test results
    if grep -q '"recovery_time": [3-9][0-9]' "$METRICS_FILE"; then
        echo "- Consider implementing faster pod restart strategies" >> "$REPORT_FILE"
    fi
    
    if grep -q '"success_rate": [0-8][0-9]' "$METRICS_FILE"; then
        echo "- Implement circuit breakers for external dependencies" >> "$REPORT_FILE"
    fi
    
    if grep -q '"downtime": [1-9][0-9]' "$METRICS_FILE"; then
        echo "- Add database connection pooling and retry logic" >> "$REPORT_FILE"
    fi
    
    log "Resilience report generated: $REPORT_FILE" "$GREEN"
}

# Cleanup function
cleanup() {
    log "Cleaning up chaos resources..." "$BLUE"
    
    # Remove any remaining chaos resources
    kubectl delete networkchaos --all -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete podchaos --all -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete iochaos --all -n "$NAMESPACE" --ignore-not-found=true
    
    # Ensure all deployments are running
    kubectl rollout status deployment/singglebee-api -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/mongodb -n "$NAMESPACE" --timeout=300s
    
    log "Cleanup completed" "$GREEN"
}

# Main execution
main() {
    log "Starting SINGGLEBEE Chaos Engineering Test Suite" "$BLUE"
    log "Environment: $ENVIRONMENT" "$BLUE"
    log "Namespace: $NAMESPACE" "$BLUE"
    log "Duration: ${CHAOS_DURATION}s" "$BLUE"
    
    # Create directories
    mkdir -p logs backups reports
    
    # Setup
    check_prerequisites
    backup_state
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Run chaos tests
    test_pod_failure
    sleep 10
    
    test_network_latency
    sleep 10
    
    test_database_failure
    sleep 10
    
    test_disk_exhaustion
    sleep 10
    
    # Generate report
    generate_report
    
    log "Chaos Engineering Test Suite completed successfully!" "$GREEN"
    log "Check the report for detailed results and recommendations" "$BLUE"
}

# Run main function
main "$@"
