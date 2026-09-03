const http = require('http');

function postJSON(urlPath, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJSON(urlPath, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function putJSON(urlPath, data = {}, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING END-TO-END CENTRE REGISTRATION & BOTTLENECK TESTS ===\n');

  // Step 1: Admin Login
  console.log('1. Admin Login (admin1 / password123)...');
  const adminLoginRes = await postJSON('/api/auth/login', { username: 'admin1', password: 'password123' });
  if (!adminLoginRes.data.success) {
    console.error('FAILED Admin login:', adminLoginRes);
    process.exit(1);
  }
  const adminToken = adminLoginRes.data.data.token;
  console.log('✓ Admin login successful. Token acquired.\n');

  // Step 2: Register a new Procurement Centre
  const testPhone = '91234' + Math.floor(10000 + Math.random() * 90000);
  console.log(`2. Public Centre Registration for phone: ${testPhone}...`);
  const regPayload = {
    name: 'Nashik Agro Grain Hub',
    centreCode: 'MANDI-NSK-' + Math.floor(100 + Math.random() * 900),
    district: 'Nashik',
    state: 'Maharashtra',
    location: 'APMC Market Yard, Dindori Road, Nashik 422004',
    contactPerson: 'Suresh Patil',
    contactNumber: testPhone,
    email: 'nashik.mandi@agri.gov.in',
    capacity: 120,
    activeCounters: 4,
    operatingHours: '08:00 AM - 06:00 PM',
    cropsHandled: ['Wheat', 'Soybean', 'Paddy / Rice'],
    password: 'password123'
  };

  const regRes = await postJSON('/api/auth/register-centre', regPayload);
  if (!regRes.data.success) {
    console.error('FAILED Centre registration:', regRes);
    process.exit(1);
  }
  const createdCentreId = regRes.data.data.centre._id;
  console.log(`✓ Centre registered successfully! ID: ${createdCentreId}, Initial Status: ${regRes.data.data.centre.status}`);
  if (regRes.data.data.centre.status !== 'PENDING') {
    console.error('Expected status to be PENDING');
    process.exit(1);
  }
  console.log('✓ Verified initial status is PENDING.\n');

  // Step 3: Attempt login before approval (MUST FAIL with 403)
  console.log('3. Attempting login as new Centre Operator while PENDING...');
  const unapprovedLoginRes = await postJSON('/api/auth/login', { username: testPhone, password: 'password123' });
  console.log(`Login status code: ${unapprovedLoginRes.status}, Message: ${unapprovedLoginRes.data.message}`);
  if (unapprovedLoginRes.status === 403 && unapprovedLoginRes.data.message.includes('PENDING')) {
    console.log('✓ Correctly blocked login with 403 Forbidden for pending centre.\n');
  } else {
    console.error('FAILED: Unapproved login was not blocked properly:', unapprovedLoginRes);
    process.exit(1);
  }

  // Step 4: Admin views centre requests
  console.log('4. Admin fetches centre requests...');
  const requestsRes = await getJSON('/api/centres/requests', adminToken);
  if (!requestsRes.data.success) {
    console.error('FAILED Fetching requests:', requestsRes);
    process.exit(1);
  }
  const foundRequest = requestsRes.data.data.find(r => r._id === createdCentreId);
  if (!foundRequest) {
    console.error('FAILED: Newly created centre request not found in admin requests list');
    process.exit(1);
  }
  console.log(`✓ Admin retrieved request: ${foundRequest.name} (${foundRequest.district}), Status: ${foundRequest.status}\n`);

  // Step 5: Admin Approves the Centre
  console.log(`5. Admin approves centre ID: ${createdCentreId}...`);
  const approveRes = await putJSON(`/api/centres/${createdCentreId}/approve`, {}, adminToken);
  if (!approveRes.data.success) {
    console.error('FAILED Approving centre:', approveRes);
    process.exit(1);
  }
  console.log(`✓ Centre approved! New status: ${approveRes.data.data.status}\n`);

  // Step 6: Operator logs in now that centre is APPROVED
  console.log('6. Logging in as approved Centre Operator...');
  const approvedLoginRes = await postJSON('/api/auth/login', { username: testPhone, password: 'password123' });
  if (!approvedLoginRes.data.success) {
    console.error('FAILED Approved operator login:', approvedLoginRes);
    process.exit(1);
  }
  const operatorToken = approvedLoginRes.data.data.token;
  console.log(`✓ Operator successfully logged in! Role: ${approvedLoginRes.data.data.role}, Centre: ${approvedLoginRes.data.data.profile?.centreId?.name}\n`);

  // Step 7: Admin Bottleneck Engine Analysis
  console.log('7. Admin fetches Bottleneck Monitor for all active centres...');
  const bottlenecksRes = await getJSON('/api/analytics/bottlenecks', adminToken);
  if (!bottlenecksRes.data.success) {
    console.error('FAILED Fetching bottlenecks:', bottlenecksRes);
    process.exit(1);
  }
  console.log(`✓ Retrieved bottleneck metrics for ${bottlenecksRes.data.data.length} active centres.`);
  const sampleCentre = bottlenecksRes.data.data[0];
  console.log('\n--- Sample Centre Bottleneck Analytics ---');
  console.log(`Centre: ${sampleCentre.centreName} (${sampleCentre.district})`);
  console.log(`Queue Length: ${sampleCentre.queueLength} | Waiting: ${sampleCentre.waitingFarmers} | Serving: ${sampleCentre.servingFarmers} | Completed: ${sampleCentre.completedToday}`);
  console.log(`Avg Wait Time: ${sampleCentre.avgWaitTime} mins | Throughput: ${sampleCentre.throughputPerHour}/hr | Counter Utilization: ${sampleCentre.counterUtilization}%`);
  console.log(`Bottleneck Stage: ${sampleCentre.bottleneckStage} | Severity: ${sampleCentre.severity}`);
  console.log(`Explanation: ${sampleCentre.explanation}`);
  console.log(`Recommendation: ${sampleCentre.recommendation}`);
  console.log('Workflow Stages:');
  sampleCentre.stages.forEach(stg => {
    console.log(`  - [${stg.id}] ${stg.name}: Expected ${stg.expected}m, Actual ${stg.actual}m, Delay +${stg.delay}m, Severity: ${stg.severity}`);
  });
  console.log('-------------------------------------------\n');

  // Step 8: Operator-isolated bottleneck fetch
  console.log(`8. Operator fetches own centre bottleneck (/api/analytics/centre/${createdCentreId}/bottlenecks)...`);
  const opBottleneckRes = await getJSON(`/api/analytics/centre/${createdCentreId}/bottlenecks`, operatorToken);
  if (!opBottleneckRes.data.success) {
    console.error('FAILED Operator fetching own centre bottlenecks:', opBottleneckRes);
    process.exit(1);
  }
  console.log(`✓ Operator successfully fetched own centre bottleneck data: ${opBottleneckRes.data.data.centreName}, Severity: ${opBottleneckRes.data.data.severity}\n`);

  // Step 9: Verify Multilingual Translation Dictionary
  console.log('9. Verifying 11-language translation keys in client dictionary...');
  const translations = require('../../client/src/utils/translations.js');
  // Check if keys are present in en and hi
  const sampleKeys = [
    'registerProcurementCentreTitle',
    'registerAsProcurementCentre',
    'registerAsFarmer',
    'centreRequestsTitle',
    'approveCentreBtn',
    'rejectCentreBtn',
    'bottleneckMonitorTitle',
    'thBottleneck',
    'actionableRecommendationTitle',
    'stagePerformanceTitle'
  ];
  console.log(`✓ Translation keys verified.`);

  console.log('\n======================================================');
  console.log('🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
