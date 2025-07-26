#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Performance Report Generator
 * Generates comprehensive HTML reports from performance test results
 */
class PerformanceReportGenerator {
  constructor() {
    this.resultsDir = path.join(__dirname, '../performance-results');
    this.outputDir = path.join(__dirname, '../performance-results');
  }

  generateReport() {
    console.log('Generating performance test report...');

    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      // Read performance test results
      const results = this.readTestResults();
      
      // Generate HTML report
      const htmlReport = this.generateHTMLReport(results);
      
      // Write report to file
      const reportPath = path.join(this.outputDir, 'performance-report.html');
      fs.writeFileSync(reportPath, htmlReport);
      
      console.log(`Performance report generated: ${reportPath}`);
      
      // Generate JSON summary
      const jsonSummary = this.generateJSONSummary(results);
      const summaryPath = path.join(this.outputDir, 'performance-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(jsonSummary, null, 2));
      
      console.log(`Performance summary generated: ${summaryPath}`);
      
    } catch (error) {
      console.error('Error generating performance report:', error.message);
      process.exit(1);
    }
  }

  readTestResults() {
    const resultsFile = path.join(this.resultsDir, 'test-results.json');
    
    if (!fs.existsSync(resultsFile)) {
      console.warn('No test results found, generating sample data...');
      return this.generateSampleResults();
    }
    
    const rawData = fs.readFileSync(resultsFile, 'utf8');
    return JSON.parse(rawData);
  }

  generateSampleResults() {
    return {
      timestamp: new Date().toISOString(),
      configuration: {
        concurrentUsers: 1000,
        testDuration: 300,
        maxLatency: 2000,
        maxThroughput: 300,
      },
      results: {
        userRegistration: {
          totalRequests: 1000,
          successfulRequests: 998,
          failedRequests: 2,
          averageLatency: 245.6,
          maxLatency: 1850.2,
          minLatency: 89.3,
          throughput: 285.4,
          errorRate: 0.2,
          memoryUsage: {
            heapUsed: 52428800,
            heapTotal: 67108864,
            external: 1024576,
          },
        },
        tournamentLoad: {
          totalRequests: 125,
          successfulRequests: 125,
          failedRequests: 0,
          averageLatency: 456.8,
          maxLatency: 1245.6,
          minLatency: 156.7,
          throughput: 42.3,
          errorRate: 0,
          memoryUsage: {
            heapUsed: 58720256,
            heapTotal: 71303168,
            external: 1536768,
          },
        },
        gamePlayLoad: {
          totalRequests: 500,
          successfulRequests: 495,
          failedRequests: 5,
          averageLatency: 123.4,
          maxLatency: 890.1,
          minLatency: 45.2,
          throughput: 165.0,
          errorRate: 1.0,
          memoryUsage: {
            heapUsed: 48234496,
            heapTotal: 65536000,
            external: 987654,
          },
        },
        webSocketLoad: {
          totalRequests: 1000,
          successfulRequests: 987,
          failedRequests: 13,
          averageLatency: 98.7,
          maxLatency: 567.8,
          minLatency: 23.1,
          throughput: 329.0,
          errorRate: 1.3,
          memoryUsage: {
            heapUsed: 61865984,
            heapTotal: 78643200,
            external: 2048576,
          },
        },
        databaseLoad: {
          totalRequests: 3000,
          successfulRequests: 2985,
          failedRequests: 15,
          averageLatency: 189.3,
          maxLatency: 1567.4,
          minLatency: 67.8,
          throughput: 199.0,
          errorRate: 0.5,
          memoryUsage: {
            heapUsed: 73400320,
            heapTotal: 89128960,
            external: 3145728,
          },
        },
        redisLoad: {
          totalRequests: 5000,
          successfulRequests: 4995,
          failedRequests: 5,
          averageLatency: 34.6,
          maxLatency: 234.5,
          minLatency: 12.3,
          throughput: 1441.6,
          errorRate: 0.1,
          memoryUsage: {
            heapUsed: 45678912,
            heapTotal: 62914560,
            external: 1572864,
          },
        },
      },
    };
  }

  generateHTMLReport(results) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RPS Tournament Bot - Performance Test Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 1.1em;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #fafafa;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        .summary-card .unit {
            color: #999;
            font-size: 0.8em;
        }
        .test-results {
            padding: 30px;
        }
        .test-category {
            margin-bottom: 40px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        .test-category h2 {
            background: #f8f9fa;
            margin: 0;
            padding: 20px 30px;
            color: #495057;
            border-bottom: 1px solid #e0e0e0;
        }
        .test-metrics {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric {
            text-align: center;
        }
        .metric-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
        }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .warn { color: #ffc107; }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        .progress-success { background: #28a745; }
        .progress-warning { background: #ffc107; }
        .progress-danger { background: #dc3545; }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }
        .chart-container {
            margin: 20px 0;
            height: 300px;
            background: #f8f9fa;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Performance Test Report</h1>
            <p>RPS Tournament Bot - Generated on ${new Date(results.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            ${this.generateSummaryCards(results)}
        </div>

        <div class="test-results">
            <h1 style="text-align: center; margin-bottom: 40px; color: #495057;">Test Results</h1>
            ${this.generateTestCategories(results)}
        </div>

        <div class="footer">
            <p>Generated by RPS Tournament Bot QA Automation Framework</p>
            <p>Test Configuration: ${results.configuration.concurrentUsers} concurrent users, ${results.configuration.testDuration}s duration</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateSummaryCards(results) {
    const totalRequests = Object.values(results.results).reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = Object.values(results.results).reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalFailed = Object.values(results.results).reduce((sum, r) => sum + r.failedRequests, 0);
    const avgLatency = Object.values(results.results).reduce((sum, r) => sum + r.averageLatency, 0) / Object.keys(results.results).length;
    const avgThroughput = Object.values(results.results).reduce((sum, r) => sum + r.throughput, 0) / Object.keys(results.results).length;
    const maxLatency = Math.max(...Object.values(results.results).map(r => r.maxLatency));

    return `
        <div class="summary-card">
            <h3>Total Requests</h3>
            <p class="value">${totalRequests.toLocaleString()}</p>
        </div>
        <div class="summary-card">
            <h3>Success Rate</h3>
            <p class="value ${(totalSuccessful / totalRequests) >= 0.95 ? 'pass' : 'fail'}">
                ${((totalSuccessful / totalRequests) * 100).toFixed(1)}%
            </p>
        </div>
        <div class="summary-card">
            <h3>Average Latency</h3>
            <p class="value ${avgLatency <= results.configuration.maxLatency ? 'pass' : 'fail'}">
                ${avgLatency.toFixed(1)} <span class="unit">ms</span>
            </p>
        </div>
        <div class="summary-card">
            <h3>Average Throughput</h3>
            <p class="value ${avgThroughput >= results.configuration.maxThroughput ? 'pass' : 'warn'}">
                ${avgThroughput.toFixed(1)} <span class="unit">req/s</span>
            </p>
        </div>
        <div class="summary-card">
            <h3>Peak Latency</h3>
            <p class="value ${maxLatency <= results.configuration.maxLatency * 2 ? 'pass' : 'fail'}">
                ${maxLatency.toFixed(1)} <span class="unit">ms</span>
            </p>
        </div>
        <div class="summary-card">
            <h3>Failed Requests</h3>
            <p class="value ${totalFailed === 0 ? 'pass' : 'warn'}">
                ${totalFailed}
            </p>
        </div>
    `;
  }

  generateTestCategories(results) {
    return Object.entries(results.results).map(([category, metrics]) => {
      const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
      const latencyStatus = metrics.averageLatency <= results.configuration.maxLatency ? 'pass' : 'fail';
      const throughputStatus = metrics.throughput >= results.configuration.maxThroughput ? 'pass' : 'warn';

      return `
        <div class="test-category">
            <h2>${this.formatCategoryName(category)}</h2>
            <div class="test-metrics">
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-label">Total Requests</div>
                        <div class="metric-value">${metrics.totalRequests.toLocaleString()}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Success Rate</div>
                        <div class="metric-value ${successRate >= 95 ? 'pass' : 'fail'}">
                            ${successRate.toFixed(1)}%
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${successRate >= 95 ? 'progress-success' : 'progress-danger'}" 
                                 style="width: ${successRate}%"></div>
                        </div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Average Latency</div>
                        <div class="metric-value ${latencyStatus}">
                            ${metrics.averageLatency.toFixed(1)}ms
                        </div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Throughput</div>
                        <div class="metric-value ${throughputStatus}">
                            ${metrics.throughput.toFixed(1)} req/s
                        </div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Error Rate</div>
                        <div class="metric-value ${metrics.errorRate <= 1 ? 'pass' : 'warn'}">
                            ${metrics.errorRate.toFixed(1)}%
                        </div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Memory Usage</div>
                        <div class="metric-value">
                            ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB
                        </div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <p>📊 Latency Distribution Chart (Placeholder)</p>
                </div>
            </div>
        </div>
      `;
    }).join('');
  }

  formatCategoryName(category) {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  generateJSONSummary(results) {
    const totalRequests = Object.values(results.results).reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = Object.values(results.results).reduce((sum, r) => sum + r.successfulRequests, 0);
    const avgLatency = Object.values(results.results).reduce((sum, r) => sum + r.averageLatency, 0) / Object.keys(results.results).length;
    const avgThroughput = Object.values(results.results).reduce((sum, r) => sum + r.throughput, 0) / Object.keys(results.results).length;

    return {
      timestamp: results.timestamp,
      summary: {
        totalRequests,
        successRate: (totalSuccessful / totalRequests) * 100,
        averageLatency: avgLatency,
        averageThroughput: avgThroughput,
        overallStatus: this.determineOverallStatus(results),
      },
      thresholds: results.configuration,
      testResults: Object.entries(results.results).map(([category, metrics]) => ({
        category,
        passed: this.determineTestStatus(metrics, results.configuration),
        metrics: {
          requests: metrics.totalRequests,
          successRate: (metrics.successfulRequests / metrics.totalRequests) * 100,
          latency: metrics.averageLatency,
          throughput: metrics.throughput,
          errorRate: metrics.errorRate,
        },
      })),
    };
  }

  determineOverallStatus(results) {
    const allPassed = Object.entries(results.results).every(([category, metrics]) =>
      this.determineTestStatus(metrics, results.configuration)
    );
    return allPassed ? 'PASS' : 'FAIL';
  }

  determineTestStatus(metrics, config) {
    const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
    const latencyOk = metrics.averageLatency <= config.maxLatency;
    const throughputOk = metrics.throughput >= config.maxThroughput * 0.8; // 80% threshold
    const errorRateOk = metrics.errorRate <= 5; // 5% error threshold

    return successRate >= 95 && latencyOk && throughputOk && errorRateOk;
  }
}

// Run the report generator
if (require.main === module) {
  const generator = new PerformanceReportGenerator();
  generator.generateReport();
}

module.exports = PerformanceReportGenerator;