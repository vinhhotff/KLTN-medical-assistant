import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics for MediAssist-AI Telehealth Platform
export const cacheHitRate = new Rate('two_layer_cache_hit_rate');
export const clinicalTriageDuration = new Trend('clinical_triage_duration_ms');
export const doctorSearchDuration = new Trend('doctor_search_duration_ms');
export const failedRequests = new Counter('custom_failed_requests');

// 500+ VU High-Load Stress Test Configuration (Milestone 7)
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Warm-up to 50 VUs
    { duration: '1m',  target: 200 },  // Ramp-up to 200 VUs
    { duration: '2m',  target: 500 },  // Sustained peak load at 500 VUs
    { duration: '30s', target: 700 },  // Extreme spike test at 700 VUs
    { duration: '1m',  target: 200 },  // Ramp-down recovery to 200 VUs
    { duration: '30s', target: 0 },    // Cool-down to 0 VUs
  ],
  thresholds: {
    // 95% of all HTTP requests must complete within 200ms under 500+ VU load
    'http_req_duration': ['p(95)<200', 'p(99)<450'],
    // Fast Two-Layer Cache reads (L1 Caffeine + L2 Redis) must complete in under 50ms (P95)
    'doctor_search_duration_ms': ['p(95)<50', 'avg<20'],
    // Platform error rate must remain under 0.5% (Enterprise 99.5% SLA)
    'http_req_failed': ['rate<0.005'],
    // Cache hit rate must remain high for repeated queries
    'two_layer_cache_hit_rate': ['rate>0.90'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  // Group 1: Infrastructure Liveness & Readiness Probes (Zero-Downtime Verification)
  group('01_Infrastructure_Health', function () {
    const liveRes = http.get(`${BASE_URL}/api/v1/health/live`, params);
    check(liveRes, {
      'Live probe status 200': (r) => r.status === 200,
    }) || failedRequests.add(1);

    const readyRes = http.get(`${BASE_URL}/api/v1/health/ready`, params);
    const readyCheck = check(readyRes, {
      'Ready probe status 200': (r) => r.status === 200,
      'PostgreSQL pool UP': (r) => r.body && r.body.includes('"database":"UP"'),
      'Redis L2 cluster UP': (r) => r.body && r.body.includes('"redis":"UP"'),
      'L1 Caffeine UP': (r) => r.body && r.body.includes('"twoLayerCache":"UP"'),
    });
    if (!readyCheck) failedRequests.add(1);
  });

  // Group 2: High-Throughput Doctor Directory & Semantic Search (Two-Layer Cache L1/L2)
  group('02_Two_Layer_Cache_Doctor_Search', function () {
    const start = new Date().getTime();

    // Repeated search queries hitting L1 Caffeine (<1ms) and L2 Redis (1-3ms)
    const page = Math.floor(Math.random() * 3);
    const searchRes = http.get(`${BASE_URL}/api/v1/doctors?page=${page}&size=10`, params);

    const duration = new Date().getTime() - start;
    doctorSearchDuration.add(duration);

    const searchSuccess = check(searchRes, {
      'Doctor search status 200': (r) => r.status === 200,
      'Response has data payload': (r) => r.body && r.body.includes('"success":true'),
    });

    if (searchSuccess) {
      // If response time is below 35ms, it represents an L1/L2 cache hit
      cacheHitRate.add(duration < 35);
    } else {
      failedRequests.add(1);
      cacheHitRate.add(false);
    }
  });

  // Group 3: Clinical AI Triage Red-Flag Fast Evaluation (Simulated Patient Inflow)
  group('03_Clinical_Triage_Evaluation', function () {
    const triageStart = new Date().getTime();

    const symptomsList = [
      'Tôi bị đau đầu nhẹ, hơi sốt 37.8 độ từ sáng nay',
      'Đau tức ngực trái dữ dội, khó thở vã mồ hôi và choáng váng', // Red flag trigger
      'Đau bụng âm ỉ vùng thượng vị sau khi ăn đồ cay nóng',
      'Ho khan kéo dài 3 ngày, ngứa rát cổ họng nhưng không khó thở',
    ];
    const selectedSymptom = symptomsList[Math.floor(Math.random() * symptomsList.length)];

    const payload = JSON.stringify({
      symptoms: selectedSymptom,
      patientAge: 35,
      hasPreExistingCondition: false,
    });

    // Anonymous triage safety filter check (Hard Red-Flag Regex Guard)
    const triageRes = http.post(`${BASE_URL}/api/v1/triage/assess`, payload, params);
    const triageDuration = new Date().getTime() - triageStart;
    clinicalTriageDuration.add(triageDuration);

    check(triageRes, {
      'Triage responds 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  // Pacing: 0.1s to 0.5s realistic user think time
  sleep(0.1 + Math.random() * 0.4);
}
