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

async function runSeedProcurementVerification() {
  console.log('=== VERIFYING SEEDED REALISTIC HISTORICAL PROCUREMENT DATA ===\n');

  // Step 1: Login
  console.log('1. Farmer & Operator Login...');
  const farmerLogin = await postJSON('/api/auth/login', { username: '9876543210', password: 'password123' });
  const opLogin = await postJSON('/api/auth/login', { username: 'operator1', password: 'password123' });
  const adminLogin = await postJSON('/api/auth/login', { username: 'admin1', password: 'password123' });

  if (!farmerLogin.data.success || !opLogin.data.success || !adminLogin.data.success) {
    console.error('FAILED: Logins failed', farmerLogin, opLogin, adminLogin);
    process.exit(1);
  }
  const farmerToken = farmerLogin.data.token;
  const opToken = opLogin.data.token;
  const adminToken = adminLogin.data.token;
  console.log('✓ All accounts logged in successfully.\n');

  // Step 2: Fetch Centres
  console.log('2. Fetching available centres...');
  const centresRes = await getJSON('/api/centres', farmerToken);
  const centres = centresRes.data.data;
  const kharadiCentre = centres.find(c => c.name.includes('Kharadi'));
  const hadapsarCentre = centres.find(c => c.name.includes('Hadapsar'));
  console.log(`✓ Primary Mandi: ${kharadiCentre.name} (ID: ${kharadiCentre._id})`);
  console.log(`✓ Secondary Mandi: ${hadapsarCentre.name} (ID: ${hadapsarCentre._id})\n`);

  // Step 3: Test Dynamic Performance on Kharadi Mandi (Should now have >= 3 completed records)
  console.log('3. Testing Smart Queue Advisor & Dynamic Performance Engine on Kharadi Mandi...');
  const advisorRes = await getJSON(`/api/slots/advisor?centreId=${kharadiCentre._id}`, farmerToken);
  if (!advisorRes.data.success || !advisorRes.data.data) {
    console.error('FAILED: Advisor response invalid', advisorRes);
    process.exit(1);
  }
  const advisor = advisorRes.data.data;
  const perf = advisor.dynamicPerformance;

  console.log('✓ Retrieved Dynamic Performance Metrics from Real Records:');
  console.log(`  - Data Points Available: ${perf.dataPointsCount} records`);
  console.log(`  - Fallback Mode Active: ${perf.isFallback ? 'YES (Fallback)' : 'NO (Using Real MongoDB Records)'}`);
  console.log(`  - Dynamic Avg Processing Time: ${perf.avgProcessingTime} min/farmer`);
  console.log(`  - Calculated Throughput: ${perf.farmersPerHour} farmers/hour`);
  console.log(`  - Active Counters: ${advisor.activeCounters}`);
  console.log(`  - Best Time to Visit: ${advisor.bestTimeToVisit?.startTime} - ${advisor.bestTimeToVisit?.endTime} (~${advisor.bestTimeToVisit?.predictedWaitTime} min)`);
  console.log(`  - Expected Wait: ~${advisor.expectedWaitTime} min\n`);

  if (perf.dataPointsCount < 3) {
    console.error(`FAILED: Expected >= 3 data points, but got ${perf.dataPointsCount}`);
    process.exit(1);
  }
  if (perf.isFallback) {
    console.error('FAILED: isFallback is still true when >= 3 completed records exist!');
    process.exit(1);
  }
  console.log('✓ SUCCESS: Dynamic Performance Analyzer is actively using REAL DATABASE RECORDS!\n');

  // Step 4: Test Slots Prediction with Real Dynamic Processing Time
  console.log('4. Testing slot predictions for Kharadi Mandi...');
  const todayStr = new Date().toISOString().split('T')[0];
  const slotsRes = await getJSON(`/api/slots?centreId=${kharadiCentre._id}&date=${todayStr}`, farmerToken);
  const slots = slotsRes.data.data;
  console.log(`✓ Fetched ${slots.length} time slots.`);
  console.log('--- Sample Slots with Dynamic Rates ---');
  slots.slice(0, 5).forEach(s => {
    console.log(`  ${s.startTime} - ${s.endTime}  [${s.congestion}]  ~${s.predictedWaitTime} min  (Proc Time: ${s.dynamicProcessingTime}m, Fallback: ${s.isFallback})`);
  });
  console.log('---------------------------------------\n');

  console.log('================================================================');
  console.log('🎉 HISTORICAL SEED DEMO PROCUREMENT DATA VERIFIED 100%!');
  console.log('================================================================\n');
}

runSeedProcurementVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
