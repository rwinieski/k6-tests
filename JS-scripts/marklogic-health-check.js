import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.1'], // http errors should be less than 10%
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
  },
  // TLS/SSL configuration
  insecureSkipTLSVerify: __ENV.INSECURE_SKIP_TLS_VERIFY === 'true', // Skip TLS certificate verification
};

export default function () {
  const MARKLOGIC_HOST = __ENV.MARKLOGIC_HOST || 'https://ml-k6.ml-kube.com';
  const APP_SERVICES_PORT = __ENV.APP_SERVICES_PORT || '443';
  const ADMIN_PORT = __ENV.ADMIN_PORT || '443';
  const MANAGE_PORT = __ENV.MANAGE_PORT || '443';
  const BASE_PATH = __ENV.BASE_PATH || '/console/qconsole/'; // Optional base path for load balancers
  const CONSOLE_BASE_PATH = __ENV.CONSOLE_BASE_PATH || '/console/qconsole/'; // Optional Console base path for load balancers
  const ADMIN_BASE_PATH = __ENV.ADMIN_BASE_PATH || '/adminUI/'; // Optional Admin base path for load balancers
  const MANAGE_BASE_PATH = __ENV.MANAGE_BASE_PATH || '/manage/v2/'; // Optional Manage base path for load balancers
  
  // Test MarkLogic App Services endpoint (port 8000)
  const appServicesUrl = `${MARKLOGIC_HOST}:${APP_SERVICES_PORT}${BASE_PATH}`;
  
  const appServicesRes = http.get(appServicesUrl, {
    timeout: '10s',
  });

  check(appServicesRes, {
    'MarkLogic App Services is reachable': (r) => r.status === 200 || r.status === 401 || r.status === 302,
    'MarkLogic App Services response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Test MarkLogic Admin UI endpoint (port 8001)
  const adminUrl = `${MARKLOGIC_HOST}:${ADMIN_PORT}${ADMIN_BASE_PATH}`;
  
  const adminRes = http.get(adminUrl, {
    timeout: '10s',
  });

  check(adminRes, {
    'MarkLogic Admin UI is reachable': (r) => r.status === 200 || r.status === 401 || r.status === 302,
    'MarkLogic Admin UI response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Test MarkLogic Manage endpoint (port 8002)
  const manageUrl = `${MARKLOGIC_HOST}:${MANAGE_PORT}${MANAGE_BASE_PATH}`;
  
  const manageRes = http.get(manageUrl, {
    timeout: '10s',
  });

  check(manageRes, {
    'MarkLogic Manage API is reachable': (r) => r.status === 200 || r.status === 401 || r.status === 302,
    'MarkLogic Manage API response time < 2s': (r) => r.timings.duration < 2000,
  });

  console.log(`App Services Status: ${appServicesRes.status}, Admin UI Status: ${adminRes.status}, Manage API Status: ${manageRes.status}`);

  sleep(1);
}
