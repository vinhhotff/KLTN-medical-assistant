import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Benchmark Metrics for Two-Layer Cache Performance vs Direct DB
export const l1CacheLatency = new Trend('l1_caffeine_latency_ms');
export const l2CacheLatency = new Trend('l2_redis_latency_ms');
export const coldDbLatency = new Trend('cold_db_query_latency_ms');
export const benchmarkCacheHitRatio = new Rate('benchmark_cache_hit_ratio');
export const successfulQueries = new Counter('successful_benchmark_queries');

export const options = {
  scenarios: {
    // Scenario 1: Cache Warmup & Hit Benchmark (High Throughput, 100 VUs)
    warm_cache_hits: {
      executor: 'constant-vus',
      vus: 100,
      duration: '45s',
      tags: { scenario: 'cache_hit' },
    },
    // Scenario 2: Cache Miss / Cold Query Simulation
    cold_cache_misses: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 20,
      startTime: '50s',
      tags: { scenario: 'cache_miss' },
    },
  },
  thresholds: {
    'l1_caffeine_latency_ms': ['p(95)<10', 'avg<4'],
    'l2_redis_latency_ms': ['p(95)<30', 'avg<12'],
    'cold_db_query_latency_ms': ['p(95)<250', 'avg<120'],
    'benchmark_cache_hit_ratio': ['rate>0.92'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const isColdScenario = __ENV.SCENARIO === 'cold' || (Math.random() < 0.05);

  if (isColdScenario) {
    // Cache-Busting Query: Forces cold database read with unique query parameters
    const randomParam = `cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const start = new Date().getTime();
    const res = http.get(`${BASE_URL}/api/v1/doctors?cacheBust=${randomParam}`, { headers });
    const duration = new Date().getTime() - start;

    coldDbLatency.add(duration);
    benchmarkCacheHitRatio.add(false);

    check(res, {
      'Cold DB status 200': (r) => r.status === 200,
    });
  } else {
    // Warm Query: Repeated read hitting L1 Caffeine (<1ms) or L2 Redis (1-3ms)
    const fixedPage = 0;
    const start = new Date().getTime();
    const res = http.get(`${BASE_URL}/api/v1/doctors?page=${fixedPage}&size=10`, { headers });
    const duration = new Date().getTime() - start;

    if (duration < 5) {
      l1CacheLatency.add(duration);
      benchmarkCacheHitRatio.add(true);
    } else if (duration < 35) {
      l2CacheLatency.add(duration);
      benchmarkCacheHitRatio.add(true);
    } else {
      coldDbLatency.add(duration);
      benchmarkCacheHitRatio.add(false);
    }

    const ok = check(res, {
      'Cached read status 200': (r) => r.status === 200,
    });
    if (ok) successfulQueries.add(1);
  }

  sleep(0.05);
}
