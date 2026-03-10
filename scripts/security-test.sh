#!/bin/bash

# 🔒 SINGGLEBEE SECURITY TESTING SCRIPT
# Comprehensive security testing for development and CI/CD

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
REPORTS_DIR="$PROJECT_ROOT/security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run test and capture result
run_test() {
    local test_name="$1"
    local test_command="$2"
    local report_file="$3"
    
    log_info "Running $test_name..."
    
    if eval "$test_command" > "$report_file" 2>&1; then
        log_success "$test_name completed"
        return 0
    else
        log_error "$test_name failed"
        return 1
    fi
}

# Function to check security score
check_security_score() {
    local score_file="$REPORTS_DIR/security_score_$TIMESTAMP.json"
    
    if [[ -f "$score_file" ]]; then
        local score=$(jq -r '.score' "$score_file" 2>/dev/null || echo "0")
        local max_score=$(jq -r '.maxScore' "$score_file" 2>/dev/null || echo "100")
        local status=$(jq -r '.status' "$score_file" 2>/dev/null || echo "Unknown")
        
        log_info "Security Score: $score/$max_score ($status)"
        
        if [[ $score -ge 90 ]]; then
            log_success "Excellent security posture!"
        elif [[ $score -ge 80 ]]; then
            log_success "Good security posture!"
        elif [[ $score -ge 70 ]]; then
            log_warning "Fair security posture - improvements needed"
        else
            log_error "Poor security posture - immediate attention required"
        fi
    fi
}

# Main security testing function
main() {
    log_info "🔒 Starting SINGGLEBEE Security Testing..."
    log_info "Timestamp: $TIMESTAMP"
    log_info "Reports directory: $REPORTS_DIR"
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # 1. Dependency Security Scan
    log_info "📦 Running Dependency Security Scan..."
    total_tests=$((total_tests + 1))
    
    if command_exists npm; then
        if run_test "npm audit" "cd '$SERVER_DIR' && npm audit --audit-level=moderate" "$REPORTS_DIR/npm_audit_$TIMESTAMP.txt"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
        
        # Run Snyk if available
        if command_exists snyk && [[ -n "${SNYK_TOKEN:-}" ]]; then
            total_tests=$((total_tests + 1))
            if run_test "Snyk scan" "cd '$SERVER_DIR' && snyk test --severity-threshold=high" "$REPORTS_DIR/snyk_$TIMESTAMP.txt"; then
                passed_tests=$((passed_tests + 1))
            else
                failed_tests=$((failed_tests + 1))
            fi
        fi
    else
        log_error "npm not found"
        failed_tests=$((failed_tests + 1))
    fi
    
    # 2. Static Code Analysis
    log_info "🔍 Running Static Code Analysis..."
    total_tests=$((total_tests + 1))
    
    if command_exists eslint; then
        if run_test "ESLint security scan" "cd '$SERVER_DIR' && npx eslint . --ext .js,.ts --config .eslintrc.json --format=json > '$REPORTS_DIR/eslint_$TIMESTAMP.json' && npx eslint . --ext .js,.ts --config .eslintrc.json" "$REPORTS_DIR/eslint_$TIMESTAMP.txt"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    else
        log_warning "ESLint not found, skipping..."
    fi
    
    # Run Semgrep if available
    if command_exists semgrep; then
        total_tests=$((total_tests + 1))
        if run_test "Semgrep SAST scan" "cd '$PROJECT_ROOT' && semgrep --config=p/security-audit --config=p/owasp-top-ten --json --output='$REPORTS_DIR/semgrep_$TIMESTAMP.json'" "$REPORTS_DIR/semgrep_$TIMESTAMP.txt"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    fi
    
    # 3. Container Security Scan
    log_info "🐳 Running Container Security Scan..."
    total_tests=$((total_tests + 1))
    
    if command_exists docker; then
        # Build Docker image for scanning
        log_info "Building Docker image for security scanning..."
        if docker build -f "$SERVER_DIR/Dockerfile.security" -t singglebee-backend:test "$SERVER_DIR" > "$REPORTS_DIR/docker_build_$TIMESTAMP.txt" 2>&1; then
            # Run Trivy if available
            if command_exists trivy; then
                total_tests=$((total_tests + 1))
                if run_test "Trivy container scan" "trivy image --format json --output '$REPORTS_DIR/trivy_$TIMESTAMP.json' singglebee-backend:test && trivy image singglebee-backend:test" "$REPORTS_DIR/trivy_$TIMESTAMP.txt"; then
                    passed_tests=$((passed_tests + 1))
                else
                    failed_tests=$((failed_tests + 1))
                fi
            fi
            
            # Run Docker Scout if available
            if command_exists docker && [[ -n "${DOCKER_SCOUT_TOKEN:-}" ]]; then
                total_tests=$((total_tests + 1))
                if run_test "Docker Scout scan" "docker scout cves --image singglebee-backend:test --format json > '$REPORTS_DIR/docker_scout_$TIMESTAMP.json' && docker scout cves singglebee-backend:test" "$REPORTS_DIR/docker_scout_$TIMESTAMP.txt"; then
                    passed_tests=$((passed_tests + 1))
                else
                    failed_tests=$((failed_tests + 1))
                fi
            fi
            
            # Clean up test image
            docker rmi singglebee-backend:test > /dev/null 2>&1 || true
        else
            log_error "Docker build failed"
            failed_tests=$((failed_tests + 1))
        fi
    else
        log_warning "Docker not found, skipping container security scan..."
    fi
    
    # 4. Infrastructure Security Scan
    log_info "🏗️ Running Infrastructure Security Scan..."
    total_tests=$((total_tests + 1))
    
    if command_exists checkov; then
        if run_test "Checkov IaC scan" "cd '$PROJECT_ROOT' && checkov -d . --framework dockerfile --output json --output-file-path '$REPORTS_DIR'" "$REPORTS_DIR/checkov_$TIMESTAMP.txt"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    else
        log_warning "Checkov not found, skipping infrastructure scan..."
    fi
    
    # Run Hadolint if available
    if command_exists hadolint; then
        total_tests=$((total_tests + 1))
        if run_test "Hadolint Dockerfile scan" "hadolint '$SERVER_DIR/Dockerfile.security' --format json > '$REPORTS_DIR/hadolint_$TIMESTAMP.json' && hadolint '$SERVER_DIR/Dockerfile.security'" "$REPORTS_DIR/hadolint_$TIMESTAMP.txt"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    fi
    
    # 5. Application Security Scan (if server is running)
    log_info "🕵️ Running Application Security Scan..."
    
    if command_exists curl && curl -s http://localhost:5000/health > /dev/null 2>&1; then
        total_tests=$((total_tests + 1))
        
        if command_exists zap-cli || command_exists zap; then
            if run_test "OWASP ZAP scan" "zap-cli quick-scan --spider -t http://localhost:5000 > '$REPORTS_DIR/zap_$TIMESTAMP.txt'" "$REPORTS_DIR/zap_$TIMESTAMP.txt"; then
                passed_tests=$((passed_tests + 1))
            else
                failed_tests=$((failed_tests + 1))
            fi
        else
            log_warning "OWASP ZAP not found, skipping application scan..."
        fi
    else
        log_warning "Server not running, skipping application security scan..."
    fi
    
    # 6. Compliance Check
    log_info "📋 Running Compliance Check..."
    total_tests=$((total_tests + 1))
    
    # OWASP Top 10 compliance
    local compliance_score=0
    
    # Check for security headers
    if grep -r "helmet\|security-headers" "$SERVER_DIR" > /dev/null 2>&1; then
        compliance_score=$((compliance_score + 2))
        log_success "Security headers found"
    else
        log_warning "Security headers not found"
    fi
    
    # Check for input validation
    if find "$SERVER_DIR" -name "*.js" -o -name "*.ts" | xargs grep -l "zod\|joi\|validation" > /dev/null 2>&1; then
        compliance_score=$((compliance_score + 2))
        log_success "Input validation found"
    else
        log_warning "Input validation not found"
    fi
    
    # Check for authentication
    if find "$SERVER_DIR" -name "*.js" -o -name "*.ts" | xargs grep -l "auth\|jwt\|passport" > /dev/null 2>&1; then
        compliance_score=$((compliance_score + 2))
        log_success "Authentication found"
    else
        log_warning "Authentication not found"
    fi
    
    # Check for rate limiting
    if find "$SERVER_DIR" -name "*.js" -o -name "*.ts" | xargs grep -l "rate.*limit\|express-rate-limit" > /dev/null 2>&1; then
        compliance_score=$((compliance_score + 2))
        log_success "Rate limiting found"
    else
        log_warning "Rate limiting not found"
    fi
    
    # Check for HTTPS enforcement
    if grep -r "https\|tls\|ssl" "$SERVER_DIR" > /dev/null 2>&1; then
        compliance_score=$((compliance_score + 2))
        log_success "HTTPS enforcement found"
    else
        log_warning "HTTPS enforcement not found"
    fi
    
    echo "Compliance Score: $compliance_score/10" > "$REPORTS_DIR/compliance_$TIMESTAMP.txt"
    
    if [[ $compliance_score -ge 8 ]]; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # 7. Generate Security Score
    log_info "📊 Generating Security Score..."
    
    local security_score=$((passed_tests * 100 / total_tests))
    local status="Unknown"
    
    if [[ $security_score -ge 90 ]]; then
        status="Excellent"
    elif [[ $security_score -ge 80 ]]; then
        status="Good"
    elif [[ $security_score -ge 70 ]]; then
        status="Fair"
    elif [[ $security_score -ge 60 ]]; then
        status="Poor"
    else
        status="Critical"
    fi
    
    cat > "$REPORTS_DIR/security_score_$TIMESTAMP.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "totalTests": $total_tests,
  "passedTests": $passed_tests,
  "failedTests": $failed_tests,
  "score": $security_score,
  "maxScore": 100,
  "status": "$status",
  "complianceScore": $compliance_score,
  "reports": {
    "npmAudit": "npm_audit_$TIMESTAMP.txt",
    "eslint": "eslint_$TIMESTAMP.txt",
    "semgrep": "semgrep_$TIMESTAMP.txt",
    "trivy": "trivy_$TIMESTAMP.txt",
    "dockerScout": "docker_scout_$TIMESTAMP.txt",
    "checkov": "checkov_$TIMESTAMP.txt",
    "hadolint": "hadolint_$TIMESTAMP.txt",
    "zap": "zap_$TIMESTAMP.txt",
    "compliance": "compliance_$TIMESTAMP.txt"
  }
}
EOF
    
    check_security_score
    
    # 8. Generate Summary Report
    log_info "📋 Generating Summary Report..."
    
    cat > "$REPORTS_DIR/security_summary_$TIMESTAMP.md" << EOF
# 🔒 SINGGLEBEE Security Test Report

**Generated:** $(date)
**Timestamp:** $TIMESTAMP

## 📊 Executive Summary

- **Security Score:** $security_score/100 ($status)
- **Tests Passed:** $passed_tests/$total_tests
- **Tests Failed:** $failed_tests/$total_tests
- **Compliance Score:** $compliance_score/10

## 🧪 Test Results

### ✅ Passed Tests ($passed_tests)
EOF
    
    if [[ $passed_tests -gt 0 ]]; then
        echo "- All security tests completed successfully" >> "$REPORTS_DIR/security_summary_$TIMESTAMP.md"
    fi
    
    cat >> "$REPORTS_DIR/security_summary_$TIMESTAMP.md" << EOF

### ❌ Failed Tests ($failed_tests)
EOF
    
    if [[ $failed_tests -gt 0 ]]; then
        echo "- Some security tests failed - review detailed reports" >> "$REPORTS_DIR/security_summary_$TIMESTAMP.md"
    fi
    
    cat >> "$REPORTS_DIR/security_summary_$TIMESTAMP.md" << EOF

## 📁 Detailed Reports

- [Dependency Scan](npm_audit_$TIMESTAMP.txt)
- [Code Analysis](eslint_$TIMESTAMP.txt)
- [SAST Scan](semgrep_$TIMESTAMP.txt)
- [Container Scan](trivy_$TIMESTAMP.txt)
- [Infrastructure Scan](checkov_$TIMESTAMP.txt)
- [Compliance Check](compliance_$TIMESTAMP.txt)

## 🎯 Recommendations

EOF
    
    if [[ $security_score -lt 80 ]]; then
        cat >> "$REPORTS_DIR/security_summary_$TIMESTAMP.md" << EOF
### High Priority
1. Address failed security tests immediately
2. Review and fix critical vulnerabilities
3. Implement missing security controls
4. Update dependencies to latest secure versions

### Medium Priority
1. Enhance security monitoring and logging
2. Implement additional security headers
3. Add more comprehensive input validation
4. Strengthen authentication mechanisms

### Low Priority
1. Optimize security configurations
2. Add more comprehensive test coverage
3. Implement advanced security features
4. Enhance documentation and training
EOF
    else
        cat >> "$REPORTS_DIR/security_summary_$TIMESTAMP.md" << EOF
### Maintenance
1. Regular security scanning (weekly)
2. Dependency updates (monthly)
3. Security training (quarterly)
4. Penetration testing (annually)

### Improvements
1. Consider additional security tools
2. Enhance monitoring capabilities
3. Implement zero-trust architecture
4. Add advanced threat detection
EOF
    fi
    
    # Final summary
    echo ""
    log_info "🎯 Security Testing Complete!"
    log_info "📊 Security Score: $security_score/100 ($status)"
    log_info "📁 Reports saved to: $REPORTS_DIR"
    log_info "📋 Summary report: $REPORTS_DIR/security_summary_$TIMESTAMP.md"
    
    if [[ $security_score -lt 70 ]]; then
        log_error "🚨 CRITICAL: Security posture requires immediate attention!"
        exit 1
    elif [[ $security_score -lt 80 ]]; then
        log_warning "⚠️ WARNING: Security posture needs improvement"
        exit 2
    else
        log_success "✅ Security posture is acceptable"
        exit 0
    fi
}

# Run main function
main "$@"
