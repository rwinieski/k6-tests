import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';

// Helper functions for random data generation
function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate random data similar to FastCsvLoader
const generateRandomDocument = () => {
  return JSON.stringify({
    id: `${Date.now()}-${randomIntBetween(1, 1000000)}`,
    first_name: randomString(8),
    last_name: randomString(10),
    email: `${randomString(8)}@example.com`,
    ip_address: `${randomIntBetween(1, 255)}.${randomIntBetween(1, 255)}.${randomIntBetween(1, 255)}.${randomIntBetween(1, 255)}`,
    city: randomString(10),
    state: randomString(2).toUpperCase(),
    postal_code: `${randomIntBetween(10000, 99999)}`,
    country: randomString(12),
    phone_number: `${randomIntBetween(100, 999)}-${randomIntBetween(100, 999)}-${randomIntBetween(1000, 9999)}`
  });
};

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],     // HTTP errors should be less than 1%
    http_req_duration: ['p(95)<5000'],  // 95% of requests should be below 5s
    'http_req_duration{operation:write}': ['p(95)<3000'], // Write operations under 3s
  },
  // TLS/SSL configuration
  insecureSkipTLSVerify: __ENV.INSECURE_SKIP_TLS_VERIFY === 'true', // Skip TLS certificate verification
};

export default function () {
  const MARKLOGIC_ENDPOINT = __ENV.MARKLOGIC_ENDPOINT || 'https://ml-k6.ml-kube.com';
  const MARKLOGIC_PORT = __ENV.MARKLOGIC_PORT || '443';
  const MARKLOGIC_USER = __ENV.MARKLOGIC_USER || 'X0FlWXIbvy';
  const MARKLOGIC_PASSWORD = __ENV.MARKLOGIC_PASSWORD || 'GeoAB';
  const MARKLOGIC_DATABASE = __ENV.MARKLOGIC_DATABASE || 'Documents';
  const BATCH_SIZE = parseInt(__ENV.BATCH_SIZE || '10');
  const BASE_PATH = __ENV.BASE_PATH || '/console/qconsole'; // Optional base path for load balancers
  const AUTH_TYPE = __ENV.AUTH_TYPE || 'digest'; // 'basic' or 'digest'

  // Create batch of documents
  const batch = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    batch.push(generateRandomDocument());
  }

  // Write documents in batch using MarkLogic REST API
  const documents = batch.map((doc, index) => {
    const uri = `/test/row/${Date.now()}-${index}.json`;
    return {
      uri: uri,
      content: doc
    };
  });

  const payload = JSON.stringify({ documents: documents });

  // Configure authentication based on AUTH_TYPE
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s',
    tags: { operation: 'write' },
  };

  if (AUTH_TYPE === 'basic') {
    // Basic authentication - add Authorization header
    const credentials = `${MARKLOGIC_USER}:${MARKLOGIC_PASSWORD}`;
    const encodedCredentials = encoding.b64encode(credentials);
    params.headers['Authorization'] = `Basic ${encodedCredentials}`;
  } else if (AUTH_TYPE === 'digest') {
    // Digest authentication - use auth parameter
    params.auth = 'digest';
  }

  // Write to MarkLogic with database parameter
  const writeUrl = `${MARKLOGIC_ENDPOINT}:${MARKLOGIC_PORT}${BASE_PATH}/v1/documents?database=${MARKLOGIC_DATABASE}`;
  const writeRes = http.post(writeUrl, payload, params);

  check(writeRes, {
    'write successful': (r) => r.status === 200 || r.status === 204,
    'write response time ok': (r) => r.timings.duration < 5000,
  });

  // Query documents (optional read test) with database parameter
  const queryUrl = `${MARKLOGIC_ENDPOINT}:${MARKLOGIC_PORT}${BASE_PATH}/v1/search?database=${MARKLOGIC_DATABASE}&q=*&pageLength=10`;
  
  const queryParams = {
    headers: {
      'Accept': 'application/json',
    },
    tags: { operation: 'read' },
    timeout: '5s',
  };

  if (AUTH_TYPE === 'basic') {
    const credentials = `${MARKLOGIC_USER}:${MARKLOGIC_PASSWORD}`;
    const encodedCredentials = encoding.b64encode(credentials);
    queryParams.headers['Authorization'] = `Basic ${encodedCredentials}`;
  } else if (AUTH_TYPE === 'digest') {
    queryParams.auth = 'digest';
  }

  const queryRes = http.get(queryUrl, queryParams);

  check(queryRes, {
    'query successful': (r) => r.status === 200,
    'query response time ok': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
