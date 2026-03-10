import pino from 'pino';
const logger = pino();
/**
 * @fileoverview Load testing and benchmarking
 */
import { performance } from 'perf_hooks';

class LoadTester {
  constructor(coordinator) {
    this.coordinator = coordinator;
  }

  async runLoadTest(options = {}) {
    const {
      taskCount = 1000,
      concurrency = 50,
      duration = 60000, // 60 seconds
    } = options;

    logger.info(`🚀 Starting load test: ${taskCount} tasks, ${concurrency} concurrent`);

    const results = {
      totalTasks: 0,
      completed: 0,
      failed: 0,
      latencies: [],
      startTime: Date.now(),
    };

    // Generate tasks
    const tasks = Array(taskCount).fill(0).map((_, i) => ({
      id: `load-test-${i}`,
      description: `Test task ${i}`,
      priority: Math.floor(Math.random() * 10) + 1,
    }));

    // Execute with concurrency limit
    const chunks = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
      chunks.push(tasks.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const start = performance.now();
      const promises = chunk.map(task => 
        this.coordinator.routeTask(task)
          .then(() => {
            results.completed++;
            results.latencies.push(performance.now() - start);
          })
          .catch(() => results.failed++)
      );
      await Promise.allSettled(promises);
      results.totalTasks += chunk.length;
    }

    const endTime = Date.now();
    const duration_sec = (endTime - results.startTime) / 1000;

    // Calculate statistics
    results.latencies.sort((a, b) => a - b);
    const p50 = results.latencies[Math.floor(results.latencies.length * 0.5)];
    const p95 = results.latencies[Math.floor(results.latencies.length * 0.95)];
    const p99 = results.latencies[Math.floor(results.latencies.length * 0.99)];
    const throughput = results.completed / duration_sec;

    logger.info('\n📊 Load Test Results:');
    logger.info(`   Total Tasks: ${results.totalTasks}`);
    logger.info(`   Completed: ${results.completed}`);
    logger.info(`   Failed: ${results.failed}`);
    logger.info(`   Duration: ${duration_sec.toFixed(2)}s`);
    logger.info(`   Throughput: ${throughput.toFixed(2)} tasks/sec`);
    logger.info(`   Latency P50: ${p50.toFixed(2)}ms`);
    logger.info(`   Latency P95: ${p95.toFixed(2)}ms`);
    logger.info(`   Latency P99: ${p99.toFixed(2)}ms`);

    return results;
  }
}

export { LoadTester };
