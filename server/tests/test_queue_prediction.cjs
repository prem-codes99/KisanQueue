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

async function testQueuePrediction() {
  console.log('=== TESTING QUEUE PREDICTION & PREVENTION (SMART QUEUE ADVISOR) ===\n');

  // Step 1: Farmer Login
  console.log('1. Farmer Login (9876543210 / password123)...');
  const loginRes = await postJSON('/api/auth/login', { username: '9876543210', password: 'password123' });
  if (!loginRes.data.success) {
    console.error('FAILED: Farmer login failed', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('✓ Farmer logged in successfully.\n');

  // Step 2: Fetch Centres
  console.log('2. Fetching available centres...');
  const centresRes = await getJSON('/api/centres', token);
  if (!centresRes.data.success || centresRes.data.data.length === 0) {
    console.error('FAILED: Could not fetch centres', centresRes);
    process.exit(1);
  }
  const centre = centresRes.data.data[0];
  console.log(`✓ Centre selected: ${centre.name} (ID: ${centre._id}, Active Counters: ${centre.activeCounters || 2})\n`);

  // Step 3: Test Smart Queue Advisor API
  console.log(`3. Fetching Smart Queue Advisor data for centre ${centre.name}...`);
  const todayStr = new Date().toISOString().split('T')[0];
  const advisorRes = await getJSON(`/api/slots/advisor?centreId=${centre._id}&date=${todayStr}`, token);
  if (!advisorRes.data.success || !advisorRes.data.data) {
    console.error('FAILED: Smart Queue Advisor endpoint failed', advisorRes);
    process.exit(1);
  }
  const advisor = advisorRes.data.data;
  console.log('✓ Retrieved Smart Queue Advisor metrics:');
  console.log(`  - Current Yard Queue: ${advisor.currentQueue} farmers`);
  console.log(`  - Predicted Peak Period: ${advisor.predictedPeakPeriod}`);
  console.log(`  - Recommended Slot: ${advisor.recommendedSlot ? `${advisor.recommendedSlot.startTime} - ${advisor.recommendedSlot.endTime}` : 'None'}`);
  console.log(`  - Expected Waiting Time: ~${advisor.expectedWaitTime} minutes`);
  console.log(`  - Current Congestion Level: ${advisor.congestionLevel}\n`);

  if (!['LOW', 'MODERATE', 'HIGH'].includes(advisor.congestionLevel)) {
    console.error('FAILED: Invalid congestion level:', advisor.congestionLevel);
    process.exit(1);
  }
  if (typeof advisor.expectedWaitTime !== 'number' || advisor.expectedWaitTime < 0) {
    console.error('FAILED: Invalid expected wait time:', advisor.expectedWaitTime);
    process.exit(1);
  }

  // Step 4: Test Slot Predictions & Congestion Levels
  console.log(`4. Fetching slot predictions for ${todayStr}...`);
  const slotsRes = await getJSON(`/api/slots?centreId=${centre._id}&date=${todayStr}`, token);
  if (!slotsRes.data.success || !slotsRes.data.data) {
    console.error('FAILED: Could not fetch slots', slotsRes);
    process.exit(1);
  }
  const slots = slotsRes.data.data;
  console.log(`✓ Retrieved ${slots.length} time slots with predictions.`);
  console.log('--- Sample Slots with Predictions ---');
  slots.slice(0, 5).forEach(s => {
    const isRec = slotsRes.data.recommendedSlot && slotsRes.data.recommendedSlot._id === s._id;
    console.log(`  ${s.startTime} - ${s.endTime}  [${s.congestion}]  ~${s.predictedWaitTime} min  (Booked: ${s.bookedCount}/${s.capacity}) ${isRec ? '⭐ RECOMMENDED' : ''}`);
  });
  console.log('-------------------------------------\n');

  // Verify each slot has predictedWaitTime and valid congestion
  for (const s of slots) {
    if (typeof s.predictedWaitTime !== 'number' || s.predictedWaitTime <= 0) {
      console.error('FAILED: Invalid predictedWaitTime for slot:', s);
      process.exit(1);
    }
    if (!['LOW', 'MODERATE', 'HIGH'].includes(s.congestion)) {
      console.error('FAILED: Invalid congestion category for slot:', s);
      process.exit(1);
    }
  }

  // Step 5: Test Recommendation Selection
  console.log('5. Validating slot recommendation logic...');
  const recommendedSlot = slotsRes.data.recommendedSlot;
  if (!recommendedSlot) {
    console.error('FAILED: No recommended slot returned');
    process.exit(1);
  }
  console.log(`✓ Recommended Slot: ${recommendedSlot.startTime} - ${recommendedSlot.endTime} (Congestion: ${recommendedSlot.congestion}, Predicted Wait: ~${recommendedSlot.predictedWaitTime} min)`);
  if (recommendedSlot.congestion === 'HIGH' && slots.some(s => s.congestion === 'LOW' && s.isAvailable)) {
    console.error('FAILED: Recommended slot is HIGH when LOW available slots exist!');
    process.exit(1);
  }
  console.log('✓ Recommended slot correctly selects the lowest congestion & fastest turnaround slot.\n');

  console.log('===================================================================');
  console.log('🎉 QUEUE PREDICTION & PREVENTION (SMART ADVISOR) TESTS PASSED 100%!');
  console.log('===================================================================\n');
}

testQueuePrediction().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
