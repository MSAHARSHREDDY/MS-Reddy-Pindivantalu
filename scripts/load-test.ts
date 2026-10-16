/**
 * Automated Load Testing Suite for Sahadeep Reddy's PindiVantalu Store
 *
 * Usage:
 *   npx tsx scripts/load-test.ts
 *
 * Options via environment variables:
 *   TARGET_URL=http://localhost:3000       # Target base URL
 *   CONCURRENCY=25                         # Concurrent virtual shoppers
 *   DURATION=15                            # Test duration in seconds
 */

import { performance } from 'perf_hooks';

interface LoadTestOptions {
  baseUrl: string;
  concurrency: number;
  durationSeconds: number;
}

interface RequestResult {
  endpoint: string;
  durationMs: number;
  status: number;
  success: boolean;
  error?: string;
}

const ENDPOINTS = [
  { path: '/api/health', name: 'Health Check' },
  { path: '/api/products', name: 'Product Catalog' },
  { path: '/api/categories', name: 'Category Navigation' },
  { path: '/api/products?search=mixture', name: 'Live Search Query' },
  { path: '/api/payment/config', name: 'Razorpay Config' },
];

async function runVirtualUser(
  options: LoadTestOptions,
  endTime: number,
  results: RequestResult[]
): Promise<void> {
  let endpointIndex = 0;

  while (Date.now() < endTime) {
    const target = ENDPOINTS[endpointIndex % ENDPOINTS.length];
    endpointIndex++;

    const start = performance.now();
    try {
      const res = await fetch(`${options.baseUrl}${target.path}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PindiVantalu-LoadTester/1.0',
        },
      });

      const durationMs = performance.now() - start;
      await res.text(); // Consume response body

      results.push({
        endpoint: target.name,
        durationMs,
        status: res.status,
        success: res.ok,
      });
    } catch (err: any) {
      const durationMs = performance.now() - start;
      results.push({
        endpoint: target.name,
        durationMs,
        status: 0,
        success: false,
        error: err.message,
      });
    }

    // Small realistic delay between requests (10ms - 50ms)
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 40) + 10));
  }
}

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

async function runLoadTest() {
  const baseUrl = (process.env.TARGET_URL || 'http://localhost:3000').replace(/\/$/, '');
  const concurrency = parseInt(process.env.CONCURRENCY || '25', 10);
  const durationSeconds = parseInt(process.env.DURATION || '10', 10);

  console.log('='.repeat(70));
  console.log('🚀 SAHADEEP REDDY\'S STORE — HIGH-PERFORMANCE LOAD TEST');
  console.log('='.repeat(70));
  console.log(`Target URL:      ${baseUrl}`);
  console.log(`Concurrency:     ${concurrency} concurrent virtual shoppers`);
  console.log(`Duration:        ${durationSeconds} seconds`);
  console.log(`Simulated Paths: ${ENDPOINTS.map((e) => e.path).join(', ')}`);
  console.log('-'.repeat(70));
  console.log('⚡ Starting load test run...\n');

  const results: RequestResult[] = [];
  const testStartTime = Date.now();
  const testEndTime = testStartTime + durationSeconds * 1000;

  const workers = Array.from({ length: concurrency }).map(() =>
    runVirtualUser({ baseUrl, concurrency, durationSeconds }, testEndTime, results)
  );

  await Promise.all(workers);

  const totalTimeSeconds = (Date.now() - testStartTime) / 1000;
  const totalRequests = results.length;
  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const reqPerSec = Math.round((totalRequests / totalTimeSeconds) * 10) / 10;

  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));
  const minLatency = Math.round(latencies[0] || 0);
  const maxLatency = Math.round(latencies[latencies.length - 1] || 0);
  const p50 = Math.round(calculatePercentile(latencies, 50));
  const p90 = Math.round(calculatePercentile(latencies, 90));
  const p95 = Math.round(calculatePercentile(latencies, 95));
  const p99 = Math.round(calculatePercentile(latencies, 99));

  console.log('='.repeat(70));
  console.log('📊 LOAD TEST BENCHMARK RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Requests:      ${totalRequests.toLocaleString()}`);
  console.log(`Successful (2xx):    ${successfulRequests.toLocaleString()} (${Math.round((successfulRequests / (totalRequests || 1)) * 100)}%)`);
  console.log(`Failed / Errored:    ${failedRequests.toLocaleString()}`);
  console.log(`Throughput:          ${reqPerSec} req/sec`);
  console.log(`Actual Duration:     ${totalTimeSeconds.toFixed(2)}s`);
  console.log('-'.repeat(70));
  console.log('⏱️  LATENCY BENCHMARKS (ms):');
  console.log(`  Min:   ${minLatency} ms`);
  console.log(`  Avg:   ${avgLatency} ms`);
  console.log(`  p50:   ${p50} ms`);
  console.log(`  p90:   ${p90} ms`);
  console.log(`  p95:   ${p95} ms`);
  console.log(`  p99:   ${p99} ms`);
  console.log(`  Max:   ${maxLatency} ms`);
  console.log('-'.repeat(70));
  console.log('🎯 BREAKDOWN BY ENDPOINT:');

  for (const ep of ENDPOINTS) {
    const epResults = results.filter((r) => r.endpoint === ep.name);
    const epCount = epResults.length;
    const epSuccess = epResults.filter((r) => r.success).length;
    const epLatencies = epResults.map((r) => r.durationMs).sort((a, b) => a - b);
    const epAvg = Math.round(epLatencies.reduce((a, b) => a + b, 0) / (epCount || 1));
    const epP95 = Math.round(calculatePercentile(epLatencies, 95));

    console.log(`  • ${ep.name.padEnd(22)}: ${epCount.toString().padStart(4)} reqs | Success: ${Math.round((epSuccess / (epCount || 1)) * 100)}% | Avg: ${epAvg}ms | p95: ${epP95}ms`);
  }

  console.log('='.repeat(70));
  if (failedRequests === 0 && p95 < 500) {
    console.log('✅ PASS: Server handled concurrent load smoothly with sub-second p95 latency.');
  } else if (failedRequests === 0) {
    console.log('⚠️ ACCEPTABLE: All requests succeeded, but p95 latency exceeded 500ms.');
  } else {
    console.log('❌ ATTENTION: Some requests failed during high load. Review database or connection pooling.');
  }
  console.log('='.repeat(70));
}

runLoadTest().catch((err) => {
  console.error('Fatal load test failure:', err);
  process.exit(1);
});
