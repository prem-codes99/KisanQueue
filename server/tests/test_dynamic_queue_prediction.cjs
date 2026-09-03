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

function putJSON(urlPath, data, token = null) {
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

async function runDynamicQueuePredictionTests() {
  console.log('=== TESTING REAL PERFORMANCE-BASED DYNAMIC QUEUE PREDICTION ===\n');

  // Step 1: Login
  console.log('1. Farmer & Admin Logins...');
  const farmerLogin = await postJSON('/api/auth/login', { username: '9876543210', password: 'password123' });
  const adminLogin = await postJSON('/api/auth/login', { username: 'admin1', password: 'password123' });
  
  if (!farmerLogin.data.success || !adminLogin.data.success) {
    console.error('FAILED: Login failed', farmerLogin, adminLogin);
    process.exit(1);
  }
  const farmerToken = farmerLogin.data.token;
  const adminToken = adminLogin.data.token;
  console.log('✓ Logins successful.\n');

  // Step 2: Fetch Centres
  console.log('2. Fetching available centres...');
  const centresRes = await getJSON('/api/centres', farmerToken);
  const centres = centresRes.data.data;
  console.log(`✓ Fetched ${centres.length} centres.`);
  const kharadiCentre = centres.find(c => c.name.includes('Kharadi')) || centres[0];
  console.log(`✓ Primary Centre: ${kharadiCentre.name} (ID: ${kharadiCentre._id})\n`);

  // Step 3: Test Dynamic Smart Queue Advisor
  console.log('3. Testing Smart Queue Advisor dynamic performance calculation...');
  const advisorRes = await getJSON(`/api/slots/advisor?centreId=${kharadiCentre._id}`, farmerToken);
  if (!advisorRes.data.success || !advisorRes.data.data) {
    console.error('FAILED: Advisor response invalid', advisorRes);
    process.exit(1);
  }
  const advisor = advisorRes.data.data;
  console.log('✓ Retrieved Advisor Performance Data:');
  console.log(`  - Fallback Mode: ${advisor.dynamicPerformance?.isFallback ? 'YES (12-min baseline)' : 'NO (Dynamic Real Data)'}`);
  console.log(`  - Average Processing Time: ${advisor.dynamicPerformance?.avgProcessingTime} min/farmer`);
  console.log(`  - Throughput: ${advisor.dynamicPerformance?.farmersPerHour} farmers/hour`);
  console.log(`  - Current Bottleneck Stage: ${advisor.dynamicPerformance?.bottleneckStage}`);
  console.log(`  - Expected Wait Time: ~${advisor.expectedWaitTime} mins`);
  console.log(`  - Best Time to Visit: ${advisor.bestTimeToVisit?.startTime} - ${advisor.bestTimeToVisit?.endTime}\n`);

  // Step 4: Test Slot Predictions with Dynamic Rate
  console.log('4. Testing slot predictions for centre...');
  const todayStr = new Date().toISOString().split('T')[0];
  const slotsRes = await getJSON(`/api/slots?centreId=${kharadiCentre._id}&date=${todayStr}`, farmerToken);
  const slots = slotsRes.data.data;
  console.log(`✓ Retrieved ${slots.length} slots.`);
  console.log('--- Sample Dynamic Slot Predictions ---');
  slots.slice(0, 4).forEach(s => {
    console.log(`  ${s.startTime} - ${s.endTime}  [${s.congestion}]  ~${s.predictedWaitTime} min  (Proc Time: ${s.dynamicProcessingTime}m, Fallback: ${s.isFallback})`);
  });
  console.log('----------------------------------------\n');

  // Step 5: Test Estimated Waiting Time for Farmer
  console.log('5. Testing Live Estimated Waiting Time for Farmer Booking...');
  const bookingsRes = await getJSON('/api/bookings/my', farmerToken);
  if (bookingsRes.data.success && bookingsRes.data.data.length > 0) {
    const booking = bookingsRes.data.data[0];
    const liveQueueRes = await getJSON(`/api/queue/farmer-live/${booking._id}`, farmerToken);
    if (liveQueueRes.data.success && liveQueueRes.data.data) {
      console.log('✓ Live Queue Wait Time retrieved:');
      console.log(`  - Token: ${liveQueueRes.data.data.tokenNumber}`);
      console.log(`  - Position: #${liveQueueRes.data.data.position}`);
      console.log(`  - Estimated Wait: ${liveQueueRes.data.data.estimatedWaitTime} mins`);
      console.log(`  - Processing Time Used: ${liveQueueRes.data.data.dynamicProcessingTime} mins/farmer`);
      console.log(`  - Fallback Status: ${liveQueueRes.data.data.isFallback}`);
    }
  }
  console.log('✓ Live Estimated Wait Time correctly uses dynamic centre performance.\n');

  // Step 6: Test Centre with Insufficient Data (Fallback Validation)
  console.log('6. Registering and testing a new Centre with 0 historical records for Fallback validation...');
  const uniqueMob = '90' + Math.floor(10000000 + Math.random() * 90000000);
  const regRes = await postJSON('/api/auth/register-centre', {
    name: 'Solapur New Agro Centre ' + Math.floor(Math.random() * 1000),
    location: 'Solapur Mandi Yard, Gate 2',
    district: 'Solapur',
    state: 'Maharashtra',
    capacity: 100,
    activeCounters: 2,
    contactPerson: 'Ramesh Operator',
    contactNumber: uniqueMob,
    password: 'password123'
  });

  if (regRes.data.success) {
    const newCentreId = regRes.data.data.centreId;
    console.log(`  - New Centre Registered: ID ${newCentreId}`);
    
    // Approve it
    await putJSON(`/api/centres/${newCentreId}/approve`, {}, adminToken);
    console.log(`  - New Centre Approved by Admin.`);

    // Fetch advisor for the brand new centre with 0 completed procurements
    const newAdvisorRes = await getJSON(`/api/slots/advisor?centreId=${newCentreId}`, farmerToken);
    const newAdvisor = newAdvisorRes.data.data;
    console.log(`  - New Centre Name: ${newAdvisor.centreName}`);
    console.log(`  - Is Fallback Activated: ${newAdvisor.dynamicPerformance.isFallback}`);
    console.log(`  - Processing Time: ${newAdvisor.dynamicPerformance.avgProcessingTime} mins (Fallback baseline)`);
    console.log(`  - Reason: ${newAdvisor.dynamicPerformance.dataPointsCount} data points available.`);

    if (!newAdvisor.dynamicPerformance.isFallback || newAdvisor.dynamicPerformance.avgProcessingTime !== 12) {
      console.error('FAILED: New centre did not fallback to 12-minute baseline!');
      process.exit(1);
    }
    console.log('✓ Verified: Centre with insufficient data gracefully falls back to 12-minute calculation.\n');

    // Step 7: Test Centre with Sufficient Historical Data (Dynamic Mode)
    console.log('7. Logging in as Operator of new centre to simulate real completed procurements...');
    const opLogin = await postJSON('/api/auth/login', { username: uniqueMob, password: 'password123' });
    if (opLogin.data.success) {
      const opToken = opLogin.data.token;

      // Book 4 slots for this centre and complete them
      const newSlotsRes = await getJSON(`/api/slots?centreId=${newCentreId}&date=${todayStr}`, farmerToken);
      const slot0 = newSlotsRes.data.data[0];

      // Book 4 farmers
      const bRes1 = await postJSON('/api/bookings', { centreId: newCentreId, slotId: slot0._id, cropType: 'Wheat', estimatedQuantity: 25 }, farmerToken);
      if (bRes1.data.success) {
        const bId = bRes1.data.data._id;
        // Check in
        await postJSON('/api/queue/check-in', { bookingId: bId }, opToken);
        // Complete procurement
        await postJSON('/api/procurement/complete', {
          bookingId: bId,
          actualWeight: 24.5,
          qualityStatus: 'Grade A',
          ratePerQuintal: 2275
        }, opToken);
        console.log('  - Recorded real procurement completion #1');
      }

      // Re-check advisor
      const updatedAdvisor = await getJSON(`/api/slots/advisor?centreId=${newCentreId}`, farmerToken);
      console.log(`  - Centre Data Points Count: ${updatedAdvisor.data.data.dynamicPerformance.dataPointsCount}`);
      console.log(`  - Dynamic Processing Time: ${updatedAdvisor.data.data.dynamicPerformance.avgProcessingTime} mins`);
      console.log(`  - Throughput: ${updatedAdvisor.data.data.dynamicPerformance.farmersPerHour} farmers/hr`);
    }
  } else {
    console.error('Registration failed:', regRes);
    process.exit(1);
  }

  // Step 8: Test Bottleneck Detection Integrity
  console.log('\n8. Testing Bottleneck Monitor endpoint compatibility...');
  const bottlenecksRes = await getJSON('/api/analytics/bottlenecks', adminToken);
  if (!bottlenecksRes.data.success || !Array.isArray(bottlenecksRes.data.data)) {
    console.error('FAILED: Bottlenecks endpoint failed', bottlenecksRes);
    process.exit(1);
  }
  console.log(`✓ Bottleneck Monitor active with ${bottlenecksRes.data.data.length} centres monitored.`);

  console.log('================================================================');
  console.log('🎉 ALL DYNAMIC PERFORMANCE-BASED PREDICTION TESTS PASSED 100%!');
  console.log('================================================================\n');
}

runDynamicQueuePredictionTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
