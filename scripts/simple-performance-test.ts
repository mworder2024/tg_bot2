#!/usr/bin/env ts-node
import { performance } from 'perf_hooks';
import * as fs from 'fs';

interface PerformanceResult {
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  opsPerSecond: number;
  memoryUsage: NodeJS.MemoryUsage;
}

class SimplePerformanceTest {
  private results: PerformanceResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Running Simple Performance Benchmarks...\n');

    // Test basic operations
    await this.testStringOperations();
    await this.testArrayOperations();
    await this.testObjectOperations();
    await this.testFileOperations();
    await this.testCpuIntensiveOperations();

    this.generateReport();
  }

  private async testStringOperations(): Promise<void> {
    const testName = 'String Operations';
    const iterations = 100000;
    
    console.log(`📝 Testing ${testName}...`);
    
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      const str = `test-string-${i}`;
      str.toUpperCase();
      str.toLowerCase();
      str.split('-');
      str.replace('test', 'demo');
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    const totalTime = endTime - startTime;

    this.results.push({
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      opsPerSecond: iterations / (totalTime / 1000),
      memoryUsage: finalMemory
    });

    console.log(`   ✅ Completed ${iterations} operations in ${totalTime.toFixed(2)}ms`);
  }

  private async testArrayOperations(): Promise<void> {
    const testName = 'Array Operations';
    const iterations = 10000;
    
    console.log(`📝 Testing ${testName}...`);
    
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      const arr = Array.from({ length: 100 }, (_, index) => index);
      arr.map(x => x * 2);
      arr.filter(x => x % 2 === 0);
      arr.reduce((sum, x) => sum + x, 0);
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    const totalTime = endTime - startTime;

    this.results.push({
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      opsPerSecond: iterations / (totalTime / 1000),
      memoryUsage: finalMemory
    });

    console.log(`   ✅ Completed ${iterations} operations in ${totalTime.toFixed(2)}ms`);
  }

  private async testObjectOperations(): Promise<void> {
    const testName = 'Object Operations';
    const iterations = 50000;
    
    console.log(`📝 Testing ${testName}...`);
    
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      const obj = {
        id: i,
        name: `user-${i}`,
        email: `user${i}@example.com`,
        active: i % 2 === 0,
        score: Math.random() * 100
      };
      
      JSON.stringify(obj);
      Object.keys(obj);
      Object.values(obj);
      const copy = { ...obj };
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    const totalTime = endTime - startTime;

    this.results.push({
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      opsPerSecond: iterations / (totalTime / 1000),
      memoryUsage: finalMemory
    });

    console.log(`   ✅ Completed ${iterations} operations in ${totalTime.toFixed(2)}ms`);
  }

  private async testFileOperations(): Promise<void> {
    const testName = 'File Operations';
    const iterations = 100;
    
    console.log(`📝 Testing ${testName}...`);
    
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      const filename = `/tmp/test-file-${i}.txt`;
      const content = `Test content ${i} - ${new Date().toISOString()}`;
      
      try {
        fs.writeFileSync(filename, content);
        fs.readFileSync(filename, 'utf8');
        fs.unlinkSync(filename);
      } catch (error) {
        // Handle file operation errors gracefully
      }
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    const totalTime = endTime - startTime;

    this.results.push({
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      opsPerSecond: iterations / (totalTime / 1000),
      memoryUsage: finalMemory
    });

    console.log(`   ✅ Completed ${iterations} operations in ${totalTime.toFixed(2)}ms`);
  }

  private async testCpuIntensiveOperations(): Promise<void> {
    const testName = 'CPU Intensive Operations';
    const iterations = 1000;
    
    console.log(`📝 Testing ${testName}...`);
    
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      // Simulate CPU intensive work
      let sum = 0;
      for (let j = 0; j < 10000; j++) {
        sum += Math.sqrt(j) * Math.sin(j) * Math.cos(j);
      }
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    const totalTime = endTime - startTime;

    this.results.push({
      testName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      opsPerSecond: iterations / (totalTime / 1000),
      memoryUsage: finalMemory
    });

    console.log(`   ✅ Completed ${iterations} operations in ${totalTime.toFixed(2)}ms`);
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(80));

    this.results.forEach(result => {
      console.log(`\n🔍 ${result.testName}:`);
      console.log(`   Iterations: ${result.iterations.toLocaleString()}`);
      console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`   Average Time: ${result.averageTime.toFixed(4)}ms per operation`);
      console.log(`   Throughput: ${result.opsPerSecond.toFixed(0).toLocaleString()} ops/second`);
      console.log(`   Memory Usage: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Memory Total: ${(result.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    });

    // Performance summary
    const totalOps = this.results.reduce((sum, r) => sum + r.iterations, 0);
    const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
    const avgOpsPerSecond = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length;
    const maxMemoryUsage = Math.max(...this.results.map(r => r.memoryUsage.heapUsed));

    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`   Total Operations: ${totalOps.toLocaleString()}`);
    console.log(`   Total Test Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Average Throughput: ${avgOpsPerSecond.toFixed(0).toLocaleString()} ops/second`);
    console.log(`   Peak Memory Usage: ${(maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);

    // Performance rating
    this.generatePerformanceRating(avgOpsPerSecond, maxMemoryUsage);

    // Save results
    this.saveResults();
  }

  private generatePerformanceRating(avgOpsPerSecond: number, maxMemoryUsage: number): void {
    console.log('\n⭐ PERFORMANCE RATING:');

    const memoryUsageMB = maxMemoryUsage / 1024 / 1024;
    let performanceScore = 0;

    // Throughput scoring (max 50 points)
    if (avgOpsPerSecond > 100000) performanceScore += 50;
    else if (avgOpsPerSecond > 50000) performanceScore += 40;
    else if (avgOpsPerSecond > 25000) performanceScore += 30;
    else if (avgOpsPerSecond > 10000) performanceScore += 20;
    else performanceScore += 10;

    // Memory efficiency scoring (max 50 points)
    if (memoryUsageMB < 50) performanceScore += 50;
    else if (memoryUsageMB < 100) performanceScore += 40;
    else if (memoryUsageMB < 200) performanceScore += 30;
    else if (memoryUsageMB < 500) performanceScore += 20;
    else performanceScore += 10;

    let rating = '';
    let recommendations: string[] = [];

    if (performanceScore >= 90) {
      rating = '🟢 EXCELLENT';
      recommendations.push('Performance is excellent for production use');
    } else if (performanceScore >= 70) {
      rating = '🟡 GOOD';
      recommendations.push('Performance is good but could be optimized');
    } else if (performanceScore >= 50) {
      rating = '🟠 FAIR';
      recommendations.push('Performance needs optimization before production');
      recommendations.push('Consider implementing caching mechanisms');
    } else {
      rating = '🔴 POOR';
      recommendations.push('Significant performance optimization required');
      recommendations.push('Profile application for bottlenecks');
      recommendations.push('Consider architectural improvements');
    }

    console.log(`   Overall Rating: ${rating} (${performanceScore}/100)`);
    console.log('\n💡 RECOMMENDATIONS:');
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  private saveResults(): void {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalOperations: this.results.reduce((sum, r) => sum + r.iterations, 0),
        totalTime: this.results.reduce((sum, r) => sum + r.totalTime, 0),
        averageOpsPerSecond: this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length,
        peakMemoryUsage: Math.max(...this.results.map(r => r.memoryUsage.heapUsed))
      }
    };

    try {
      fs.writeFileSync('performance-benchmark.json', JSON.stringify(report, null, 2));
      console.log('\n📄 Performance benchmark saved to performance-benchmark.json');
    } catch (error) {
      console.warn('⚠️ Could not save performance benchmark:', error.message);
    }
  }
}

// Run the performance tests
async function main() {
  const tester = new SimplePerformanceTest();
  await tester.runAllTests();
  
  console.log('\n🏁 Performance benchmarking complete!');
}

main().catch(error => {
  console.error('❌ Performance tests failed:', error);
  process.exit(1);
});