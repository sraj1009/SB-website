#!/usr/bin/env node

// 🚀 Performance Testing for SINGGLEBEE

import fs from 'fs';
import https from 'https';
import http from 'http';

const PERFORMANCE_CONFIG = {
  target: {
    host: 'localhost',
    port: 5000,
    protocol: 'http'
  },
  tests: {
    load: {
      concurrentUsers: [10, 50, 100, 500],
      duration: 60, // seconds
      rampUpTime: 30, // seconds
      endpoints: [
        '/api/v1/products',
        '/api/v1/orders',
        '/api/v1/auth/login',
        '/api/v1/users/profile'
      ]
    },
    stress: {
      duration: 120, // seconds
      maxUsers: 1000,
      endpoints: ['/api/v1/products']
    },
    endurance: {
      duration: 300, // seconds
      users: 50,
      endpoints: ['/api/v1/products']
    },
    spike: {
      users: 200,
      duration: 30,
      endpoints: ['/api/v1/orders']
    }
  },
  thresholds: {
    responseTime: {
      target: 1000, // ms
      warning: 2000, // ms
      critical: 5000 // ms
    },
    throughput: {
      target: 100, // requests/second
      warning: 50, // requests/second
      critical: 25 // requests/second
    },
    errorRate: {
      target: 0.1, // 0.1%
      warning: 1, // 1%
      critical: 5 // 5%
    },
    cpu: {
      warning: 70, // %
      critical: 85 // %
    },
    memory: {
      warning: 70, // %
      critical: 85 // %
    }
  }
};

class PerformanceTester {
  constructor() {
    this.results = {
      load: [],
      stress: [],
      endurance: [],
      spike: [],
      summary: {}
    };
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      throughput: [],
      cpuUsage: [],
      memoryUsage: []
    };
  }

  // HTTP Request Helper
  async makeRequest(endpoint, data = null, method = 'GET') {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const options = {
        hostname: PERFORMANCE_CONFIG.target.host,
        port: PERFORMANCE_CONFIG.target.port,
        path: endpoint,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Performance-Tester/1.0'
        }
      };

      if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            responseTime,
            body: body,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  // Load Testing
  async runLoadTest() {
    console.log('🚀 Running Load Tests...');
    
    for (const userCount of PERFORMANCE_CONFIG.tests.load.concurrentUsers) {
      console.log(`\n📊 Testing with ${userCount} concurrent users...`);
      
      const testMetrics = {
        userCount,
        startTime: Date.now(),
        requests: [],
        errors: [],
        responseTime: []
      };
      
      const promises = [];
      
      // Create concurrent users
      for (let user = 0; user < userCount; user++) {
        const userPromises = [];
        
        // Each user makes requests to different endpoints
        for (const endpoint of PERFORMANCE_CONFIG.tests.load.endpoints) {
          const userRequests = [];
          
          // Make requests over the test duration
          const requestInterval = setInterval(async () => {
            try {
              const response = await this.makeRequest(endpoint);
              testMetrics.requests.push(response);
              userRequests.push(response);
              
              if (!response.success) {
                testMetrics.errors.push({
                  user: user + 1,
                  endpoint,
                  error: response.statusCode || 'Network error',
                  timestamp: new Date().toISOString()
                });
              }
            } catch (error) {
                testMetrics.errors.push({
                  user: user + 1,
                  endpoint,
                  error: error.message,
                  timestamp: new Date().toISOString()
                });
              }
            }, 1000); // Request every second
          
          userPromises.push(
            new Promise(resolve => {
              setTimeout(() => {
                clearInterval(requestInterval);
                resolve();
              }, PERFORMANCE_CONFIG.tests.load.duration * 1000);
            })
          );
        }
        
        promises.push(Promise.all(userPromises));
      }
      
      await Promise.all(promises);
      
      // Calculate metrics
      const endTime = Date.now();
      const duration = (endTime - testMetrics.startTime) / 1000;
      
      const avgResponseTime = testMetrics.requests.length > 0 
        ? testMetrics.requests.reduce((sum, req) => sum + req.responseTime, 0) / testMetrics.requests.length 
        : 0;
      
      const errorRate = testMetrics.requests.length > 0 
        ? (testMetrics.errors.length / testMetrics.requests.length) * 100 
        : 0;
      
      const throughput = testMetrics.requests.length / duration;
      
      const result = {
        type: 'load',
        userCount,
        duration,
        totalRequests: testMetrics.requests.length,
        totalErrors: testMetrics.errors.length,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: errorRate.toFixed(2),
        throughput: throughput.toFixed(2),
        passed: this.evaluateResults(avgResponseTime, errorRate, throughput)
      };
      
      this.results.load.push(result);
      console.log(`✅ Load test completed: ${result.userCount} users, ${result.avgResponseTime}ms avg response, ${result.errorRate}% error rate`);
    }
  }

  // Stress Testing
  async runStressTest() {
    console.log('💪 Running Stress Test...');
    
    const testMetrics = {
      startTime: Date.now(),
      requests: [],
      errors: []
    };
    
    const promises = [];
    const maxUsers = PERFORMANCE_CONFIG.tests.stress.maxUsers;
    
    // Create maximum concurrent users
    for (let user = 0; user < maxUsers; user++) {
      const userPromises = [];
      
      for (const endpoint of PERFORMANCE_CONFIG.tests.stress.endpoints) {
        const requestInterval = setInterval(async () => {
          try {
            const response = await this.makeRequest(endpoint);
            testMetrics.requests.push(response);
            
            if (!response.success) {
              testMetrics.errors.push({
                user: user + 1,
                endpoint,
                error: response.statusCode || 'Network error',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            testMetrics.errors.push({
              user: user + 1,
              endpoint,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }, 10); // Request every 10ms (100 requests/second per user)
        
        userPromises.push(
          new Promise(resolve => {
            setTimeout(() => {
              clearInterval(requestInterval);
              resolve();
            }, PERFORMANCE_CONFIG.tests.stress.duration * 1000);
          })
        );
      }
      
      promises.push(Promise.all(userPromises));
    }
    
    await Promise.all(promises);
    
    // Calculate metrics
    const endTime = Date.now();
    const duration = (endTime - testMetrics.startTime) / 1000;
    
    const avgResponseTime = testMetrics.requests.length > 0 
      ? testMetrics.requests.reduce((sum, req) => sum + req.responseTime, 0) / testMetrics.requests.length 
      : 0;
    
    const errorRate = testMetrics.requests.length > 0 
      ? (testMetrics.errors.length / testMetrics.requests.length) * 100 
      : 0;
    
    const throughput = testMetrics.requests.length / duration;
    
    const result = {
      type: 'stress',
      maxUsers,
      duration,
      totalRequests: testMetrics.requests.length,
      totalErrors: testMetrics.errors.length,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: errorRate.toFixed(2),
      throughput: throughput.toFixed(2),
      passed: this.evaluateResults(avgResponseTime, errorRate, throughput)
    };
    
    this.results.stress.push(result);
    console.log(`✅ Stress test completed: ${result.maxUsers} max users, ${result.throughput} req/s, ${result.errorRate}% error rate`);
  }

  // Endurance Testing
  async runEnduranceTest() {
    console.log('⏱️ Running Endurance Test...');
    
    const testMetrics = {
      startTime: Date.now(),
      requests: [],
      errors: []
    };
    
    const promises = [];
    const users = PERFORMANCE_CONFIG.tests.endurance.users;
    
    // Create sustained load
    for (let user = 0; user < users; user++) {
      const userPromises = [];
      
      for (const endpoint of PERFORMANCE_CONFIG.tests.endurance.endpoints) {
        const requestInterval = setInterval(async () => {
          try {
            const response = await this.makeRequest(endpoint);
            testMetrics.requests.push(response);
            
            if (!response.success) {
              testMetrics.errors.push({
                user: user + 1,
                endpoint,
                error: response.statusCode || 'Network error',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            testMetrics.errors.push({
              user: user + 1,
              endpoint,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }, 2000); // Request every 2 seconds (0.5 req/s per user)
        
        userPromises.push(
          new Promise(resolve => {
            setTimeout(() => {
              clearInterval(requestInterval);
              resolve();
            }, PERFORMANCE_CONFIG.tests.endurance.duration * 1000);
          })
        );
      }
      
      promises.push(Promise.all(userPromises));
    }
    
    await Promise.all(promises);
    
    // Calculate metrics
    const endTime = Date.now();
    const duration = (endTime - testMetrics.startTime) / 1000;
    
    const avgResponseTime = testMetrics.requests.length > 0 
      ? testMetrics.requests.reduce((sum, req) => sum + req.responseTime, 0) / testMetrics.requests.length 
      : 0;
    
    const errorRate = testMetrics.requests.length > 0 
      ? (testMetrics.errors.length / testMetrics.requests.length) * 100 
      : 0;
    
    const throughput = testMetrics.requests.length / duration;
    
    const result = {
      type: 'endurance',
      users,
      duration,
      totalRequests: testMetrics.requests.length,
      totalErrors: testMetrics.errors.length,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: errorRate.toFixed(2),
      throughput: throughput.toFixed(2),
      passed: this.evaluateResults(avgResponseTime, errorRate, throughput)
    };
    
    this.results.endurance.push(result);
    console.log(`✅ Endurance test completed: ${result.duration}s duration, ${result.avgResponseTime}ms avg response, ${result.errorRate}% error rate`);
  }

  // Spike Testing
  async runSpikeTest() {
    console.log('📈 Running Spike Test...');
    
    const testMetrics = {
      startTime: Date.now(),
      requests: [],
      errors: []
    };
    
    const promises = [];
    const users = PERFORMANCE_CONFIG.tests.spike.users;
    
    // Create sudden spike
    for (let user = 0; user < users; user++) {
      const userPromises = [];
      
      for (const endpoint of PERFORMANCE_CONFIG.tests.spike.endpoints) {
        const requestInterval = setInterval(async () => {
          try {
            const response = await this.makeRequest(endpoint);
            testMetrics.requests.push(response);
            
            if (!response.success) {
              testMetrics.errors.push({
                user: user + 1,
                endpoint,
                error: response.statusCode || 'Network error',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            testMetrics.errors.push({
              user: user + 1,
              endpoint,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }, 100); // Request every 100ms (10 req/s per user)
        
        userPromises.push(
          new Promise(resolve => {
            setTimeout(() => {
              clearInterval(requestInterval);
              resolve();
            }, PERFORMANCE_CONFIG.tests.spike.duration * 1000);
          })
        );
      }
      
      promises.push(Promise.all(userPromises));
    }
    
    await Promise.all(promises);
    
    // Calculate metrics
    const endTime = Date.now();
    const duration = (endTime - testMetrics.startTime) / 1000;
    
    const avgResponseTime = testMetrics.requests.length > 0 
      ? testMetrics.requests.reduce((sum, req) => sum + req.responseTime, 0) / testMetrics.requests.length 
      : 0;
    
    const errorRate = testMetrics.requests.length > 0 
      ? (testMetrics.errors.length / testMetrics.requests.length) * 100 
      : 0;
    
    const throughput = testMetrics.requests.length / duration;
    
    const result = {
      type: 'spike',
      users,
      duration,
      totalRequests: testMetrics.requests.length,
      totalErrors: testMetrics.errors.length,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: errorRate.toFixed(2),
      throughput: throughput.toFixed(2),
      passed: this.evaluateResults(avgResponseTime, errorRate, throughput)
    };
    
    this.results.spike.push(result);
    console.log(`✅ Spike test completed: ${result.users} users, ${result.throughput} req/s peak, ${result.errorRate}% error rate`);
  }

  // Evaluate test results against thresholds
  evaluateResults(avgResponseTime, errorRate, throughput) {
    const responseTimeStatus = 
      avgResponseTime <= PERFORMANCE_CONFIG.thresholds.responseTime.target ? 'excellent' :
      avgResponseTime <= PERFORMANCE_CONFIG.thresholds.responseTime.warning ? 'good' :
      avgResponseTime <= PERFORMANCE_CONFIG.thresholds.responseTime.critical ? 'poor' : 'failed';
    
    const errorRateStatus = 
      errorRate <= PERFORMANCE_CONFIG.thresholds.errorRate.target ? 'excellent' :
      errorRate <= PERFORMANCE_CONFIG.thresholds.errorRate.warning ? 'good' :
      errorRate <= PERFORMANCE_CONFIG.thresholds.errorRate.critical ? 'poor' : 'failed';
    
    const throughputStatus = 
      throughput >= PERFORMANCE_CONFIG.thresholds.throughput.target ? 'excellent' :
      throughput >= PERFORMANCE_CONFIG.thresholds.throughput.warning ? 'good' :
      throughput >= PERFORMANCE_CONFIG.thresholds.throughput.critical ? 'poor' : 'failed';
    
    return responseTimeStatus === 'excellent' && 
           errorRateStatus === 'excellent' && 
           throughputStatus === 'excellent';
  }

  // Generate comprehensive report
  generateReport() {
    const summary = {
      timestamp: new Date().toISOString(),
      target: PERFORMANCE_CONFIG.target,
      tests: {
        load: {
          completed: this.results.load.length > 0,
          results: this.results.load,
          summary: this.calculateTestSummary(this.results.load)
        },
        stress: {
          completed: this.results.stress.length > 0,
          results: this.results.stress,
          summary: this.calculateTestSummary(this.results.stress)
        },
        endurance: {
          completed: this.results.endurance.length > 0,
          results: this.results.endurance,
          summary: this.calculateTestSummary(this.results.endurance)
        },
        spike: {
          completed: this.results.spike.length > 0,
          results: this.results.spike,
          summary: this.calculateTestSummary(this.results.spike)
        }
      },
      overall: this.calculateOverallSummary()
    };
    
    // Save JSON report
    fs.writeFileSync('./performance-test-report.json', JSON.stringify(summary, null, 2));
    
    // Generate HTML report
    this.generateHTMLReport(summary);
    
    return summary;
  }

  // Calculate test summary
  calculateTestSummary(results) {
    if (results.length === 0) return null;
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length;
    const avgErrorRate = results.reduce((sum, r) => sum + parseFloat(r.errorRate), 0) / results.length;
    const avgThroughput = results.reduce((sum, r) => sum + parseFloat(r.throughput), 0) / results.length;
    
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    return {
      totalTests,
      passedTests,
      passRate: ((passedTests / totalTests) * 100).toFixed(1),
      avgResponseTime: Math.round(avgResponseTime),
      avgErrorRate: avgErrorRate.toFixed(2),
      avgThroughput: avgThroughput.toFixed(2),
      performance: this.getPerformanceRating(avgResponseTime, avgErrorRate, avgThroughput)
    };
  }

  // Calculate overall summary
  calculateOverallSummary() {
    const allResults = [
      ...this.results.load,
      ...this.results.stress,
      ...this.results.endurance,
      ...this.results.spike
    ];
    
    if (allResults.length === 0) return null;
    
    const avgResponseTime = allResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / allResults.length;
    const avgErrorRate = allResults.reduce((sum, r) => sum + parseFloat(r.errorRate), 0) / allResults.length;
    const avgThroughput = allResults.reduce((sum, r) => sum + parseFloat(r.throughput), 0) / allResults.length;
    
    return {
      totalTests: allResults.length,
      passedTests: allResults.filter(r => r.passed).length,
      avgResponseTime: Math.round(avgResponseTime),
      avgErrorRate: avgErrorRate.toFixed(2),
      avgThroughput: avgThroughput.toFixed(2),
      performance: this.getPerformanceRating(avgResponseTime, avgErrorRate, avgThroughput)
    };
  }

  // Get performance rating
  getPerformanceRating(avgResponseTime, errorRate, throughput) {
    const responseTimeScore = this.getScore(avgResponseTime, PERFORMANCE_CONFIG.thresholds.responseTime);
    const errorRateScore = this.getScore(errorRate, PERFORMANCE_CONFIG.thresholds.errorRate, true);
    const throughputScore = this.getScore(throughput, PERFORMANCE_CONFIG.thresholds.throughput);
    
    const overallScore = (responseTimeScore + errorRateScore + throughputScore) / 3;
    
    return overallScore >= 90 ? 'excellent' :
           overallScore >= 80 ? 'good' :
           overallScore >= 70 ? 'acceptable' :
           overallScore >= 60 ? 'poor' : 'failed';
  }

  // Get score for metric
  getScore(value, thresholds, isErrorRate = false) {
    if (isErrorRate) {
      // Lower is better for error rates
      if (value <= thresholds.target) return 100;
      if (value <= thresholds.warning) return 80;
      if (value <= thresholds.critical) return 60;
      return 40;
    } else {
      // Lower is better for response times and higher for throughput
      if (value <= thresholds.target) return 100;
      if (value <= thresholds.warning) return 80;
      if (value <= thresholds.critical) return 60;
      return 40;
    }
  }

  // Generate HTML report
  generateHTMLReport(summary) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>SINGGLEBEE Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .test-section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border-radius: 5px; }
        .excellent { background: #d4edda; color: #155724; }
        .good { background: #cce5ff; color: #004085; }
        .acceptable { background: #fff3cd; color: #856404; }
        .poor { background: #f8d7da; color: #721c24; }
        .failed { background: #f5c6cb; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 SINGGLEBEE Performance Test Report</h1>
        <p><strong>Target:</strong> ${summary.target.host}:${summary.target.port}</p>
        <p><strong>Date:</strong> ${summary.timestamp}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Overall Summary</h2>
        <p><strong>Total Tests:</strong> ${summary.overall.totalTests}</p>
        <p><strong>Passed Tests:</strong> ${summary.overall.passedTests}</p>
        <p><strong>Pass Rate:</strong> ${summary.overall.passRate}%</p>
        <p><strong>Average Response Time:</strong> ${summary.overall.avgResponseTime}ms</p>
        <p><strong>Average Error Rate:</strong> ${summary.overall.avgErrorRate}%</p>
        <p><strong>Average Throughput:</strong> ${summary.overall.avgThroughput} req/s</p>
        <p><strong>Overall Performance:</strong> 
            <span class="metric ${summary.overall.performance}">${summary.overall.performance.toUpperCase()}</span>
        </p>
    </div>
    
    ${summary.tests.load.completed ? `
    <div class="test-section">
        <h2>📊 Load Test Results</h2>
        ${summary.tests.load.summary ? `
        <table>
            <tr><th>Users</th><th>Avg Response Time</th><th>Error Rate</th><th>Throughput</th><th>Performance</th></tr>
            ${summary.tests.load.results.map(result => `
            <tr>
                <td>${result.userCount}</td>
                <td>${result.avgResponseTime}ms</td>
                <td>${result.errorRate}%</td>
                <td>${result.throughput} req/s</td>
                <td><span class="metric ${this.getPerformanceRating(result.avgResponseTime, result.errorRate, result.throughput)}">${this.getPerformanceRating(result.avgResponseTime, result.errorRate, result.throughput).toUpperCase()}</span></td>
            </tr>
            `).join('')}
        </table>
        ` : ''}
    </div>
    ` : ''}
    
    ${summary.tests.stress.completed ? `
    <div class="test-section">
        <h2>💪 Stress Test Results</h2>
        <div class="metric ${summary.tests.stress.summary.performance}">Max Users: ${summary.tests.stress.results[0].maxUsers}</div>
        <div class="metric ${summary.tests.stress.summary.performance}">Duration: ${summary.tests.stress.results[0].duration}s</div>
        <div class="metric ${summary.tests.stress.summary.performance}">Peak Throughput: ${summary.tests.stress.summary.avgThroughput} req/s</div>
    </div>
    ` : ''}
    
    ${summary.tests.endurance.completed ? `
    <div class="test-section">
        <h2>⏱️ Endurance Test Results</h2>
        <div class="metric ${summary.tests.endurance.summary.performance}">Duration: ${summary.tests.endurance.results[0].duration}s</div>
        <div class="metric ${summary.tests.endurance.summary.performance}">Sustained Load: ${summary.tests.endurance.results[0].users} users</div>
        <div class="metric ${summary.tests.endurance.summary.performance}">Stability: ${summary.tests.endurance.summary.performance}</div>
    </div>
    ` : ''}
    
    ${summary.tests.spike.completed ? `
    <div class="test-section">
        <h2>📈 Spike Test Results</h2>
        <div class="metric ${summary.tests.spike.summary.performance}">Spike Users: ${summary.tests.spike.results[0].users}</div>
        <div class="metric ${summary.tests.spike.summary.performance}">Peak Throughput: ${summary.tests.spike.summary.avgThroughput} req/s</div>
        <div class="metric ${summary.tests.spike.summary.performance}">Recovery: ${summary.tests.spike.summary.performance}</div>
    </div>
    ` : ''}
</body>
</html>`;
    
    fs.writeFileSync('./performance-test-report.html', html);
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Performance Tests...\n');
    
    if (PERFORMANCE_CONFIG.tests.load.concurrentUsers.length > 0) {
      await this.runLoadTest();
    }
    
    await this.runStressTest();
    await this.runEnduranceTest();
    await this.runSpikeTest();
    
    console.log('\n📊 Generating Report...\n');
    const report = this.generateReport();
    
    console.log('\n✅ Performance Tests Complete!');
    console.log(`📄 Reports saved: performance-test-report.json and performance-test-report.html`);
    console.log(`📊 Overall Performance: ${report.overall.performance}`);
    
    return report;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('🚀 SINGGLEBEE Performance Testing Tool');
    console.log('\nUsage: node performance-test.js <command>');
    console.log('\nCommands:');
    console.log('  run-all    - Run all performance tests');
    console.log('  load       - Run load tests');
    console.log('  stress     - Run stress test');
    console.log('  endurance  - Run endurance test');
    console.log('  spike      - Run spike test');
    return;
  }
  
  const tester = new PerformanceTester();
  
  try {
    switch (command) {
      case 'run-all':
        await tester.runAllTests();
        break;
      case 'load':
        await tester.runLoadTest();
        break;
      case 'stress':
        await tester.runStressTest();
        break;
      case 'endurance':
        await tester.runEnduranceTest();
        break;
      case 'spike':
        await tester.runSpikeTest();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PerformanceTester };
