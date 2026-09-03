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

async function runBookingCollisionFixTests() {
  console.log('=== TESTING COLLISION-FREE BOOKING ID GENERATION ===\n');

  // Step 1: Login as Farmer
  console.log('1. Logging in as farmer (9876543210 / password123)...');
  const farmerLogin = await postJSON('/api/auth/login', { username: '9876543210', password: 'password123' });
  if (!farmerLogin.data.success) {
    console.error('FAILED: Farmer login failed', farmerLogin);
    process.exit(1);
  }
  const farmerToken = farmerLogin.data.token;
  const farmerId = farmerLogin.data.user?.profile?._id;
  console.log(`✓ Farmer logged in. Farmer ID: ${farmerId}\n`);

  // Step 2: Fetch Centres and Available Slots for Tomorrow
  console.log('2. Fetching available slots for tomorrow...');
  const centresRes = await getJSON('/api/centres', farmerToken);
  const centre = centresRes.data.data[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const slotsRes = await getJSON(`/api/slots?centreId=${centre._id}&date=${tomorrowStr}`, farmerToken);
  const availableSlots = slotsRes.data.data.filter(s => s.bookedCount < s.capacity);

  if (availableSlots.length < 2) {
    console.error('FAILED: Need at least 2 available slots for testing', availableSlots);
    process.exit(1);
  }
  const slot1 = availableSlots[0];
  const slot2 = availableSlots[1];
  console.log(`✓ Centre: ${centre.name} (ID: ${centre._id})`);
  console.log(`✓ Slot 1: ${slot1.startTime} - ${slot1.endTime} (ID: ${slot1._id})`);
  console.log(`✓ Slot 2: ${slot2.startTime} - ${slot2.endTime} (ID: ${slot2._id})\n`);

  // Step 3: Book Slot 1
  console.log('3. Booking Slot 1 (Verifying no duplicate key collision on "KQ-2026-0021")...');
  const booking1Res = await postJSON('/api/bookings', {
    farmerId,
    centreId: centre._id,
    slotId: slot1._id,
    cropType: 'Wheat',
    approxQuantity: 50,
    date: tomorrowStr
  }, farmerToken);

  if (!booking1Res.data.success) {
    console.error('FAILED: Booking 1 creation failed!', booking1Res);
    process.exit(1);
  }
  const booking1 = booking1Res.data.data;
  console.log(`✓ Booking 1 Succeeded!`);
  console.log(`  - Booking ID: ${booking1.bookingId}`);
  console.log(`  - Token Number: ${booking1.tokenNumber}`);
  console.log(`  - Status: ${booking1.status}\n`);

  // Step 4: Book Slot 2
  console.log('4. Booking Slot 2 (Verifying distinct, unique Booking ID generation)...');
  const booking2Res = await postJSON('/api/bookings', {
    farmerId,
    centreId: centre._id,
    slotId: slot2._id,
    cropType: 'Paddy (Rice)',
    approxQuantity: 35,
    date: tomorrowStr
  }, farmerToken);

  if (!booking2Res.data.success) {
    console.error('FAILED: Booking 2 creation failed!', booking2Res);
    process.exit(1);
  }
  const booking2 = booking2Res.data.data;
  console.log(`✓ Booking 2 Succeeded!`);
  console.log(`  - Booking ID: ${booking2.bookingId}`);
  console.log(`  - Token Number: ${booking2.tokenNumber}`);
  console.log(`  - Status: ${booking2.status}\n`);

  // Step 5: Verify Both Booking IDs are Unique and Not Colliding
  console.log('5. Validating uniqueness and distinction...');
  console.log(`  - Booking 1 ID: ${booking1.bookingId}`);
  console.log(`  - Booking 2 ID: ${booking2.bookingId}`);

  if (booking1.bookingId === booking2.bookingId) {
    console.error('FAILED: Booking IDs are identical!', booking1.bookingId, booking2.bookingId);
    process.exit(1);
  }

  if (booking1.bookingId === 'KQ-2026-0021' || booking2.bookingId === 'KQ-2026-0021') {
    console.error('FAILED: Collided with hardcoded seed ID KQ-2026-0021!');
    process.exit(1);
  }
  console.log('✓ Verified: Both Booking IDs are completely unique, distinct, and collision-free!\n');

  console.log('================================================================');
  console.log('🎉 BOOKING ID COLLISION FIX VERIFIED 100%!');
  console.log('================================================================\n');
}

runBookingCollisionFixTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
