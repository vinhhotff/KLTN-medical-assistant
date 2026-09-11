import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Smoke Test Configuration for MediAssist-AI Milestone 1
export const options = {
  vus: 10,              // 10 concurrent virtual users
  duration: '30s',      // Run for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // 1. Liveness Probe Check
  const liveRes = http.get(`${BASE_URL}/api/v1/health/live`);
  check(liveRes, {
    'liveness status is 200': (r) => r.status === 200,
  });

  // 2. Readiness Probe Check (DB + Redis + TwoLayerCache)
  const readyRes = http.get(`${BASE_URL}/api/v1/health/ready`);
  check(readyRes, {
    'readiness status is 200': (r) => r.status === 200,
    'database is UP': (r) => r.body.includes('"database":"UP"'),
    'redis is UP': (r) => r.body.includes('"redis":"UP"'),
    'twoLayerCache is UP': (r) => r.body.includes('"twoLayerCache":"UP"'),
  });

  // 3. Admin Authentication Check
  const loginPayload = JSON.stringify({
    email: 'admin@mediassist.local',
    password: 'Admin@SecurePass2026!',
  });

  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'token is returned': (r) => r.body.includes('token'),
  });

  sleep(1);
}
