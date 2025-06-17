import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const authFailures = new Counter('auth_failures');
const taskCreationFailures = new Counter('task_creation_failures');
const authSuccessRate = new Rate('auth_success_rate');
const taskOperationDuration = new Trend('task_operation_duration');

// Load test configuration - simulating 10-100 VUs
export const options = {
  stages: [
    // Ramp-up phase
    { duration: '30s', target: 10 },   // Start with 10 users
    { duration: '1m', target: 25 },    // Scale to 25 users
    { duration: '2m', target: 50 },    // Scale to 50 users
    { duration: '2m', target: 75 },    // Scale to 75 users
    { duration: '1m', target: 100 },   // Peak at 100 users
    
    // Sustained load phase
    { duration: '3m', target: 100 },   // Maintain 100 users for 3 minutes
    
    // Scale down phase
    { duration: '1m', target: 50 },    // Scale down to 50 users
    { duration: '30s', target: 25 },   // Scale down to 25 users
    { duration: '30s', target: 0 },    // Scale down to 0 users
  ],
  
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% of requests under 2s, 99% under 5s
    http_req_failed: ['rate<0.1'],                    // Error rate should be less than 10%
    auth_success_rate: ['rate>0.9'],                  // Auth success rate should be > 90%
    task_operation_duration: ['p(95)<1500'],          // Task operations under 1.5s
  },
};

// Base configuration
const BASE_URL = 'http://localhost:7777';

// Test data pools
const TEST_USERS = [
  { username: 'Dev', password: 'TUPLES' },
  { username: 'C. Eeyo', password: 'PROFITING' },
];

const TASK_NAMES = [
  'Performance Test Task',
  'Load Testing Task',
  'Scalability Task',
  'Stress Test Task',
  'Reliability Task',
  'Database Performance Task',
  'API Endpoint Task',
  'Concurrent User Task',
];

// Utility functions
function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

function getRandomTaskName() {
  return TASK_NAMES[Math.floor(Math.random() * TASK_NAMES.length)];
}

function generateUniqueId() {
  return `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Authentication helper
function authenticate() {
  const user = getRandomUser();
  
  const loginPayload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/authenticate`, loginPayload, loginParams);
  const duration = Date.now() - startTime;

  const authSuccess = check(response, {
    'authentication status is 200': (r) => r.status === 200,
    'authentication response has token': (r) => r.json('token') !== undefined,
    'authentication completed within 5s': () => duration < 5000,
  });

  authSuccessRate.add(authSuccess);
  
  if (!authSuccess) {
    authFailures.add(1);
    console.error(`Authentication failed for ${user.username}: ${response.status} - ${response.body}`);
    return null;
  }

  return response.json('token');
}

// Main test scenario
export default function () {
  // Authentication test
  const token = authenticate();
  if (!token) {
    sleep(1);
    return; // Skip this iteration if auth failed
  }

  // Common headers for authenticated requests
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Scenario selection - simulate different user behaviors
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Task creation workflow
    taskCreationWorkflow(authHeaders);
  } else if (scenario < 0.7) {
    // 30% - Task update workflow  
    taskUpdateWorkflow(authHeaders);
  } else if (scenario < 0.9) {
    // 20% - Comment creation workflow
    commentCreationWorkflow(authHeaders);
  } else {
    // 10% - Heavy mixed operations
    mixedOperationsWorkflow(authHeaders);
  }

  // Realistic user think time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Task creation workflow
function taskCreationWorkflow(headers) {
  console.log('🆕 Executing task creation workflow');
  
  const taskId = generateUniqueId();
  const taskPayload = JSON.stringify({
    task: {
      id: taskId,
      name: getRandomTaskName(),
      isComplete: false,
      owner: 'Dev', // Using known user
    },
  });

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/task/new`, taskPayload, { headers, timeout: '10s' });
  const duration = Date.now() - startTime;
  
  taskOperationDuration.add(duration);

  const success = check(response, {
    'task creation status is 200': (r) => r.status === 200,
    'task creation completed within 3s': () => duration < 3000,
  });

  if (!success) {
    taskCreationFailures.add(1);
    console.error(`Task creation failed: ${response.status} - ${response.body}`);
  }

  sleep(0.5); // Brief pause between operations
}

// Task update workflow
function taskUpdateWorkflow(headers) {
  console.log('🔄 Executing task update workflow');
  
  // First create a task to update
  const taskId = generateUniqueId();
  const createPayload = JSON.stringify({
    task: {
      id: taskId,
      name: getRandomTaskName(),
      isComplete: false,
      owner: 'Dev',
    },
  });

  const createResponse = http.post(`${BASE_URL}/task/new`, createPayload, { headers, timeout: '10s' });
  
  if (createResponse.status !== 200) {
    console.error(`Failed to create task for update test: ${createResponse.status}`);
    return;
  }

  sleep(0.2); // Brief pause

  // Now update the task
  const updatePayload = JSON.stringify({
    task: {
      id: taskId,
      name: `${getRandomTaskName()} (Updated)`,
      isComplete: true,
      owner: 'Dev',
    },
  });

  const startTime = Date.now();
  const updateResponse = http.post(`${BASE_URL}/task/update`, updatePayload, { headers, timeout: '10s' });
  const duration = Date.now() - startTime;

  taskOperationDuration.add(duration);

  check(updateResponse, {
    'task update status is 200': (r) => r.status === 200,
    'task update completed within 3s': () => duration < 3000,
  });

  sleep(0.5);
}

// Comment creation workflow
function commentCreationWorkflow(headers) {
  console.log('💬 Executing comment creation workflow');
  
  const commentPayload = JSON.stringify({
    comment: {
      id: generateUniqueId(),
      task: 'existing-task-id', // Assuming some tasks exist
      owner: 'Dev',
      content: `Performance test comment - ${Date.now()}`,
    },
  });

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/comment/new`, commentPayload, { headers, timeout: '10s' });
  const duration = Date.now() - startTime;

  check(response, {
    'comment creation status is 200': (r) => r.status === 200,
    'comment creation completed within 2s': () => duration < 2000,
  });

  sleep(0.3);
}

// Mixed operations workflow - simulate power user
function mixedOperationsWorkflow(headers) {
  console.log('🔥 Executing mixed operations workflow');
  
  // Create multiple tasks rapidly
  for (let i = 0; i < 3; i++) {
    const taskPayload = JSON.stringify({
      task: {
        id: generateUniqueId(),
        name: `Bulk Task ${i + 1}`,
        isComplete: Math.random() > 0.5,
        owner: 'Dev',
      },
    });

    const response = http.post(`${BASE_URL}/task/new`, taskPayload, { headers, timeout: '10s' });
    
    check(response, {
      [`bulk task ${i + 1} creation success`]: (r) => r.status === 200,
    });

    sleep(0.1); // Minimal pause between bulk operations
  }

  // Add some comments
  for (let i = 0; i < 2; i++) {
    const commentPayload = JSON.stringify({
      comment: {
        id: generateUniqueId(),
        task: 'bulk-task-ref',
        owner: 'Dev',
        content: `Bulk comment ${i + 1} - ${Date.now()}`,
      },
    });

    http.post(`${BASE_URL}/comment/new`, commentPayload, { headers, timeout: '5s' });
    sleep(0.1);
  }
}

// Setup function - runs once per VU at the start
export function setup() {
  console.log('🚀 Starting k6 Performance Test Suite');
  console.log(`📊 Target: ${BASE_URL}`);
  console.log('📈 Load Profile: 10-100 Virtual Users over 12 minutes');
  
  // Verify server is accessible
  const healthCheck = http.get(BASE_URL, { timeout: '10s' });
  if (healthCheck.status === 0) {
    throw new Error(`Server not accessible at ${BASE_URL}. Please ensure the application is running.`);
  }
  
  console.log('✅ Server accessibility confirmed');
  return { timestamp: Date.now() };
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  console.log('🏁 Performance test completed');
  console.log(`⏱️  Test duration: ${(Date.now() - data.timestamp) / 1000}s`);
  console.log('📋 Check the summary report for detailed metrics');
}
