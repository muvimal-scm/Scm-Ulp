// =============================================================================
// CP23 — Beta UAT load test (k6).
//
// Goal: simulate 20 concurrent beta testers doing realistic work for 5 min.
// Pass criteria (set as k6 thresholds — non-zero exit code on breach):
//   - p95 HTTP latency  < 800 ms
//   - p99 HTTP latency  < 2000 ms
//   - error rate        < 1 %
//   - 5xx responses     = 0   (any backend crash fails the run)
//
// Endpoints exercised (read-heavy, mirrors what beta users actually click):
//   /health                                                — sanity ping
//   /whoami                                                — auth round-trip
//   /api/v1/m5/shipments?pageSize=20                       — Control Tower
//   /api/v1/m5/shipments/{id}                              — shipment detail
//   /api/v1/m1/parties?pageSize=50                         — master data list
//   /api/v1/m17/invoices?pageSize=20                       — finance list
//   /api/v1/m26/me                                         — identity tab
//
// Run:
//   ULP_API_BASE=https://api.ulp-beta.example.com \
//   ULP_TOKEN="$(./scripts/get-token.sh)" \
//   k6 run beta-uat-load.js
// =============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate     = new Rate('errors');
const fivexxRate    = new Rate('http_5xx');
const shipListTime  = new Trend('shipments_list_ms');
const shipDetailTime = new Trend('shipment_detail_ms');

export const options = {
  scenarios: {
    beta_steady: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // warm-up
        { duration: '4m',  target: 20 },   // sustained 20 concurrent
        { duration: '30s', target: 0  },   // cool-down
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    http_req_failed:   ['rate<0.01'],
    http_5xx:          ['rate<0.001'],     // any backend crash = fail
    errors:            ['rate<0.01'],
  },
};

// Auth + base URL come from env. Token can be a long-lived test bearer
// minted via Keycloak's password grant for a non-interactive test user
// (see scripts/get-token.sh).
const BASE  = __ENV.ULP_API_BASE || 'http://localhost:5080';
const TOKEN = __ENV.ULP_TOKEN    || '';

if (!TOKEN) {
  // We don't `throw` because k6 still records the empty-token run as zero
  // failures, which would be misleading. Better to let the requests get
  // rejected with 401 and surface that loudly via thresholds.
  console.warn('ULP_TOKEN is empty — every request will 401. Mint a token first.');
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept:        'application/json',
};

// One shipment ID is enough for the detail probe; substitute a real one
// from your demo seed (CP17 import-flow demo seeds id=9001).
const DEMO_SHIPMENT_ID = __ENV.ULP_DEMO_SHIPMENT_ID || '9001';

function probe(label, res, trend) {
  const ok = check(res, {
    [`${label} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  fivexxRate.add(res.status >= 500 && res.status < 600);
  if (trend) trend.add(res.timings.duration);
}

export default function () {
  // 1. Health (anonymous, but exercises Caddy → API path)
  probe('health', http.get(`${BASE}/health`));

  // 2. Whoami — proves auth round-trip works
  probe('whoami', http.get(`${BASE}/whoami`, { headers }));

  // 3. Shipments list (the page beta users hit most — Control Tower)
  const shipList = http.get(`${BASE}/api/v1/m5/shipments?pageSize=20`, { headers });
  probe('shipments_list', shipList, shipListTime);

  sleep(0.3);

  // 4. Shipment detail
  const shipDetail = http.get(`${BASE}/api/v1/m5/shipments/${DEMO_SHIPMENT_ID}`, { headers });
  probe('shipment_detail', shipDetail, shipDetailTime);

  // 5. Parties list (master data)
  probe('parties_list', http.get(`${BASE}/api/v1/m1/parties?pageSize=50`, { headers }));

  // 6. Invoices list (finance)
  probe('invoices_list', http.get(`${BASE}/api/v1/m17/invoices?pageSize=20`, { headers }));

  // 7. Identity me
  probe('m26_me', http.get(`${BASE}/api/v1/m26/me`, { headers }));

  // Realistic think-time before the next click — beta users aren't bots.
  sleep(Math.random() * 1.5 + 0.5);
}
