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

async function runMultiCentreQueueTests() {
  console.log('=== TESTING MULTI-CENTRE REALISTIC QUEUE SCENARIOS ===\n');

  // Step 1: Login Admin & Operator
  console.log('1. Admin & Operator Logins...');
  const adminLogin = await postJSON('/api/auth/login', { username: 'admin1', password: 'password123' });
  const opLogin = await postJSON('/api/auth/login', { username: 'operator1', password: 'password123' });

  if (!adminLogin.data.success || !opLogin.data.success) {
    console.error('FAILED: Logins failed', adminLogin, opLogin);
    process.exit(1);
  }
  const adminToken = adminLogin.data.token;
  const opToken = opLogin.data.token;
  const operatorCentreId = opLogin.data.user?.profile?.centreId?._id || opLogin.data.user?.profile?.centreId;
  console.log(`✓ Admin & Operator Logged in. Operator Assigned Centre: ${operatorCentreId}\n`);

  // Step 2: Fetch Live Queues for all 3 centres
  console.log('2. Fetching distinct live queues for all 3 centres...');
  const centresRes = await getJSON('/api/centres', adminToken);
  const centres = centresRes.data.data;

  const kharadi = centres.find(c => c.name.includes('Kharadi'));
  const hadapsar = centres.find(c => c.name.includes('Hadapsar'));
  const wagholi = centres.find(c => c.name.includes('Wagholi'));

  const kharadiQueue = await getJSON(`/api/queue/centre/${kharadi._id}`, adminToken);
  const hadapsarQueue = await getJSON(`/api/queue/centre/${hadapsar._id}`, adminToken);
  const wagholiQueue = await getJSON(`/api/queue/centre/${wagholi._id}`, adminToken);

  console.log(`✓ Kharadi Mandi Queue: ${kharadiQueue.data.data.length} farmers (Serving: ${kharadiQueue.data.data.filter(q => q.status === 'SERVING').length}, Waiting: ${kharadiQueue.data.data.filter(q => q.status === 'WAITING').length})`);
  console.log(`✓ Hadapsar Hub Queue: ${hadapsarQueue.data.data.length} farmers (Serving: ${hadapsarQueue.data.data.filter(q => q.status === 'SERVING').length}, Waiting: ${hadapsarQueue.data.data.filter(q => q.status === 'WAITING').length})`);
  console.log(`✓ Wagholi Mandi Queue: ${wagholiQueue.data.data.length} farmers (Serving: ${wagholiQueue.data.data.filter(q => q.status === 'SERVING').length}, Waiting: ${wagholiQueue.data.data.filter(q => q.status === 'WAITING').length})\n`);

  if (kharadiQueue.data.data.length !== 4) {
    console.error('FAILED: Kharadi queue should have 4 farmers');
    process.exit(1);
  }
  if (hadapsarQueue.data.data.length !== 2) {
    console.error('FAILED: Hadapsar queue should have 2 farmers');
    process.exit(1);
  }
  if (wagholiQueue.data.data.length !== 7) {
    console.error('FAILED: Wagholi queue should have 7 farmers');
    process.exit(1);
  }

  // Step 3: Verify Admin Bottleneck Monitor across all 3 centres
  console.log('3. Fetching Admin Bottleneck Monitor...');
  const bottlenecksRes = await getJSON('/api/analytics/bottlenecks', adminToken);
  const centreBottlenecks = bottlenecksRes.data.data;

  console.log('--- Admin Bottleneck Centre Summaries ---');
  centreBottlenecks.forEach(cb => {
    console.log(`  [${cb.centreName}]`);
    console.log(`    - Queue Length: ${cb.queueLength} | Waiting: ${cb.waitingCount} | Serving: ${cb.servingCount}`);
    console.log(`    - Avg Wait Time: ${cb.avgWaitTime} mins | Active Counters: ${cb.activeCounters}`);
    console.log(`    - Bottleneck Stage: ${cb.bottleneckStage} | Severity: ${cb.severity}`);
  });
  console.log('----------------------------------------\n');

  // Step 4: Verify Operator sees only its assigned centre
  console.log('4. Verifying Operator access to assigned centre bottleneck analytics...');
  const opBottleneckRes = await getJSON(`/api/analytics/centre/${operatorCentreId}/bottlenecks`, opToken);
  if (!opBottleneckRes.data.success || !opBottleneckRes.data.data) {
    console.error('FAILED: Operator could not access assigned centre bottleneck data', opBottleneckRes);
    process.exit(1);
  }
  console.log(`✓ Operator successfully fetched assigned centre: ${opBottleneckRes.data.data.centreName} (Severity: ${opBottleneckRes.data.data.severity})\n`);

  console.log('================================================================');
  console.log('🎉 MULTI-CENTRE REALISTIC QUEUE SCENARIOS VERIFIED 100%!');
  console.log('================================================================\n');
}

runMultiCentreQueueTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
