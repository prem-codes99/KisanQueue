import dns from 'dns';

// Conditionally set DNS servers only in non-production environments to avoid cloud VPC resolver conflicts
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (e) {
    console.warn('DNS servers could not be set:', e.message);
  }
  dns.setDefaultResultOrder('ipv4first');
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Farmer from '../models/Farmer.js';
import Centre from '../models/Centre.js';
import Operator from '../models/Operator.js';
import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import Queue from '../models/Queue.js';
import Procurement from '../models/Procurement.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const hasRemoteMongo = Boolean(process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('127.0.0.1'));
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisanqueue';

const seedDatabase = async (shouldCloseConnection = false) => {
  try {
    console.log(`Connecting to database for seeding (${isProduction ? 'Production Mode' : 'Development Mode'})...`);
    if (mongoose.connection.readyState !== 1) {
      const timeoutMs = isProduction || hasRemoteMongo ? 10000 : 2000;
      try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: timeoutMs });
      } catch (connErr) {
        if (isProduction || hasRemoteMongo) {
          console.error('Fatal: Could not connect to MongoDB for seeding in production / remote mode:', connErr.message);
          throw connErr;
        }
        console.warn('Local MongoDB unavailable, using mongodb-memory-server for local seeding...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
      }
    }
    console.log('Connected. Clearing old collections...');

    // Clear existing data
    await User.deleteMany({});
    await Farmer.deleteMany({});
    await Centre.deleteMany({});
    await Operator.deleteMany({});
    await Slot.deleteMany({});
    await Booking.deleteMany({});
    await Queue.deleteMany({});
    await Procurement.deleteMany({});
    await Payment.deleteMany({});
    await Notification.deleteMany({});

    console.log('Old collections cleared. Seeding initial accounts...');

    // Hash a default password
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    // 1. Create Users
    const farmerUser = await User.create({
      username: '9876543210', // Farmers login with mobile number
      password: 'password123', // Pre-save hook hashes it automatically
      role: 'farmer'
    });

    const operatorUser = await User.create({
      username: 'operator1',
      password: 'password123',
      role: 'operator'
    });

    const operatorUser2 = await User.create({
      username: 'operator2',
      password: 'password123',
      role: 'operator'
    });

    const adminUser = await User.create({
      username: 'admin1',
      password: 'password123',
      role: 'admin'
    });

    // 2. Create Centres
    const centres = await Centre.insertMany([
      {
        name: 'Kharadi Mandi Centre',
        location: 'Kharadi Main Road, Pune',
        district: 'Pune',
        capacity: 40,
        activeCounters: 2,
        contactNumber: '9988776655',
        status: 'active'
      },
      {
        name: 'Hadapsar Grain Hub',
        location: 'Hadapsar Industrial Estate, Pune',
        district: 'Pune',
        capacity: 60,
        activeCounters: 3,
        contactNumber: '9988776644',
        status: 'active'
      },
      {
        name: 'Wagholi Cooperative Mandi',
        location: 'Wagholi Bypass, Pune',
        district: 'Pune',
        capacity: 30,
        activeCounters: 1,
        contactNumber: '9988776633',
        status: 'active'
      }
    ]);

    const targetCentre = centres[0]; // Kharadi Mandi for active operator 1

    // 3. Create Profiles
    const farmerProfile = await Farmer.create({
      userId: farmerUser._id,
      name: 'Ramesh Baliram Patil',
      mobileNumber: '9876543210',
      farmerId: 'F-PUNE-2026-8910',
      village: 'Manjari Budruk',
      district: 'Pune',
      state: 'Maharashtra',
      preferredLanguage: 'mr' // Marathi default for testing
    });

    const operatorProfile = await Operator.create({
      userId: operatorUser._id,
      name: 'Suhas Deshmukh',
      centreId: targetCentre._id,
      contact: '9123456789'
    });

    const operatorProfile2 = await Operator.create({
      userId: operatorUser2._id,
      name: 'Anand Kulkarni',
      centreId: centres[1]._id, // Hadapsar Grain Hub
      contact: '9123456790'
    });

    console.log('Default accounts seeded successfully.');
    console.log('--- Account Credentials ---');
    console.log('Farmer:   Mob: 9876543210   Pass: password123');
    console.log('Operator: User: operator1   Pass: password123');
    console.log('Operator2:User: operator2   Pass: password123');
    console.log('Admin:    User: admin1      Pass: password123');

    // 4. Generate Slots for Today, Tomorrow, and Day-After-Tomorrow (108 total slots = 72 + 36 additional)
    const dates = [
      new Date().toISOString().split('T')[0], // Today
      new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] // Day after tomorrow (36 additional slots)
    ];

    const timeSlots = [
      { startTime: '09:00', endTime: '09:30' },
      { startTime: '09:30', endTime: '10:00' },
      { startTime: '10:00', endTime: '10:30' },
      { startTime: '10:30', endTime: '11:00' },
      { startTime: '11:00', endTime: '11:30' },
      { startTime: '11:30', endTime: '12:00' },
      { startTime: '12:00', endTime: '12:30' },
      { startTime: '12:30', endTime: '13:00' },
      { startTime: '13:30', endTime: '14:00' },
      { startTime: '14:00', endTime: '14:30' },
      { startTime: '14:30', endTime: '15:00' },
      { startTime: '15:00', endTime: '15:30' }
    ];

    console.log('Generating booking slots for next 3 days (108 slots)...');
    const allSlots = [];
    for (const centre of centres) {
      for (const date of dates) {
        const slotCapacity = Math.ceil(centre.capacity / timeSlots.length);
        const slotsForCentreDate = timeSlots.map(ts => ({
          centreId: centre._id,
          date,
          startTime: ts.startTime,
          endTime: ts.endTime,
          capacity: slotCapacity,
          bookedCount: 0,
          crowdLevel: 'LOW'
        }));
        const inserted = await Slot.insertMany(slotsForCentreDate);
        allSlots.push(...inserted);
      }
    }

    // 5. Seed historical completed procurements and live queues
    console.log('Seeding historical completed procurements, payments and live queue positions...');
    const todayStr = dates[0];
    const tomorrowStr = dates[1];
    
    // Find slots for Kharadi Mandi and Hadapsar today
    const kharadiSlots = allSlots.filter(s => s.centreId.toString() === targetCentre._id.toString() && s.date === todayStr);
    const hadapsarSlots = allSlots.filter(s => s.centreId.toString() === centres[1]._id.toString() && s.date === todayStr);
    const wagholiSlots = allSlots.filter(s => s.centreId.toString() === centres[2]._id.toString() && s.date === todayStr);

    // Create 8 dummy farmers (5 existing + 3 new farmers)
    const dummyFarmersData = [
      { name: 'Vijay Shinde', mobile: '9000000001', fid: 'F-DUMMY-101', village: 'Keshavnagar' },
      { name: 'Ashok Rao', mobile: '9000000002', fid: 'F-DUMMY-102', village: 'Lonikand' },
      { name: 'Sanjay More', mobile: '9000000003', fid: 'F-DUMMY-103', village: 'Phursungi' },
      { name: 'Dnyaneshwar Kale', mobile: '9000000004', fid: 'F-DUMMY-104', village: 'Uruli Kanchan' },
      { name: 'Pandurang Kadam', mobile: '9000000005', fid: 'F-DUMMY-105', village: 'Loni Kalbhor' },
      { name: 'Ganesh Madhavrao Jadhav', mobile: '9000000006', fid: 'F-DUMMY-106', village: 'Koregaon Mul' },
      { name: 'Sunita Popat Shinde', mobile: '9000000007', fid: 'F-DUMMY-107', village: 'Theur' },
      { name: 'Vitthal Tukaram Gaikwad', mobile: '9000000008', fid: 'F-DUMMY-108', village: 'Kunjirwadi' }
    ];

    const dummyFarmers = [];
    for (const fd of dummyFarmersData) {
      const u = await User.create({ username: fd.mobile, password: 'password123', role: 'farmer' });
      const f = await Farmer.create({
        userId: u._id,
        name: fd.name,
        mobileNumber: fd.mobile,
        farmerId: fd.fid,
        village: fd.village,
        district: 'Pune',
        state: 'Maharashtra',
        preferredLanguage: 'hi'
      });
      dummyFarmers.push(f);
    }

    // 5A1. Seed 6 Completed Procurement & Payment Records from Earlier Today
    const historicalProcurementsData = [
      {
        farmerIndex: 0,
        centre: targetCentre,
        slot: kharadiSlots[0] || kharadiSlots[0],
        cropType: 'Wheat',
        approxQuantity: 45.0,
        actualWeight: 43.8,
        qualityStatus: 'Grade A',
        ratePerQuintal: 2275,
        token: 'KQ-118',
        timeOffsetHours: 4.0, // ~09:20 AM
        bookingIdCode: 'KQ-2026-0002',
        operator: operatorProfile
      },
      {
        farmerIndex: 1,
        centre: targetCentre,
        slot: kharadiSlots[1] || kharadiSlots[0],
        cropType: 'Paddy (Rice)',
        approxQuantity: 50.0,
        actualWeight: 48.5,
        qualityStatus: 'Grade A',
        ratePerQuintal: 2183,
        token: 'KQ-110',
        timeOffsetHours: 3.75, // ~09:34 AM (15m interval)
        bookingIdCode: 'KQ-2026-0003',
        operator: operatorProfile
      },
      {
        farmerIndex: 2,
        centre: targetCentre,
        slot: kharadiSlots[1] || kharadiSlots[0],
        cropType: 'Soybean',
        approxQuantity: 34.0,
        actualWeight: 32.0,
        qualityStatus: 'Grade A',
        ratePerQuintal: 4600,
        token: 'KQ-111',
        timeOffsetHours: 3.52, // ~09:48 AM (14m interval)
        bookingIdCode: 'KQ-2026-0004',
        operator: operatorProfile
      },
      {
        farmerIndex: 3,
        centre: targetCentre,
        slot: kharadiSlots[7] || kharadiSlots[2],
        cropType: 'Maize',
        approxQuantity: 36.0,
        actualWeight: 35.0,
        qualityStatus: 'Grade B',
        ratePerQuintal: 2090,
        token: 'KQ-114',
        timeOffsetHours: 1.5, // ~13:15 PM (Afternoon)
        bookingIdCode: 'KQ-2026-0005',
        operator: operatorProfile
      },
      {
        farmerIndex: 4,
        centre: targetCentre,
        slot: kharadiSlots[8] || kharadiSlots[3],
        cropType: 'Cotton',
        approxQuantity: 56.0,
        actualWeight: 54.0,
        qualityStatus: 'Grade A',
        ratePerQuintal: 6620,
        token: 'KQ-115',
        timeOffsetHours: 1.23, // ~13:31 PM (16m interval)
        bookingIdCode: 'KQ-2026-0006',
        operator: operatorProfile
      },
      {
        farmerIndex: 0,
        centre: centres[1], // Hadapsar Grain Hub
        slot: hadapsarSlots[2] || hadapsarSlots[0],
        cropType: 'Wheat',
        approxQuantity: 40.0,
        actualWeight: 38.0,
        qualityStatus: 'Grade A',
        ratePerQuintal: 2275,
        token: 'KQ-H-102',
        timeOffsetHours: 2.5, // ~10:30 AM
        bookingIdCode: 'KQ-2026-0007',
        operator: operatorProfile2
      }
    ];

    console.log('Seeding initial 6 completed procurement & payment records...');
    for (const hp of historicalProcurementsData) {
      const farmer = dummyFarmers[hp.farmerIndex];
      const completedTime = new Date(Date.now() - (hp.timeOffsetHours * 3600000));

      const booking = await Booking.create({
        bookingId: hp.bookingIdCode,
        farmerId: farmer._id,
        centreId: hp.centre._id,
        slotId: hp.slot._id,
        cropType: hp.cropType,
        approxQuantity: hp.approxQuantity,
        tokenNumber: hp.token,
        date: todayStr,
        status: 'COMPLETED',
        createdAt: new Date(completedTime.getTime() - 45 * 60000),
        updatedAt: completedTime
      });

      const totalAmount = hp.actualWeight * hp.ratePerQuintal;

      const proc = await Procurement.create({
        bookingId: booking._id,
        farmerId: farmer._id,
        centreId: hp.centre._id,
        actualWeight: hp.actualWeight,
        qualityStatus: hp.qualityStatus,
        ratePerQuintal: hp.ratePerQuintal,
        totalAmount,
        operatorId: hp.operator._id,
        timestamp: completedTime,
        createdAt: completedTime,
        updatedAt: completedTime
      });

      await Payment.create({
        procurementId: proc._id,
        farmerId: farmer._id,
        amount: totalAmount,
        status: 'COMPLETED',
        transactionId: `TXN-SEED${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: completedTime,
        updatedAt: completedTime
      });
    }

    // 5A2. Seed 12 Additional Historical Completed Procurement & Payment Records (spread across past 7 days)
    const pastDaysProcurementsData = [
      // 6 Days Ago
      { farmerIndex: 5, centre: targetCentre, slot: kharadiSlots[0], cropType: 'Wheat', approxQuantity: 40.0, actualWeight: 39.5, qualityStatus: 'Grade A', ratePerQuintal: 2275, token: 'KQ-081', dayOffset: 6, hourOffset: 3, bookingIdCode: 'KQ-2026-0008', operator: operatorProfile },
      { farmerIndex: 7, centre: centres[1], slot: hadapsarSlots[1], cropType: 'Paddy (Rice)', approxQuantity: 55.0, actualWeight: 53.0, qualityStatus: 'Grade A', ratePerQuintal: 2183, token: 'KQ-H-082', dayOffset: 6, hourOffset: 5, bookingIdCode: 'KQ-2026-0009', operator: operatorProfile2 },
      // 5 Days Ago
      { farmerIndex: 6, centre: centres[2], slot: wagholiSlots[2], cropType: 'Soybean', approxQuantity: 30.0, actualWeight: 29.0, qualityStatus: 'Grade A', ratePerQuintal: 4600, token: 'KQ-W-083', dayOffset: 5, hourOffset: 2, bookingIdCode: 'KQ-2026-0010', operator: operatorProfile },
      { farmerIndex: 0, centre: targetCentre, slot: kharadiSlots[3], cropType: 'Maize', approxQuantity: 42.0, actualWeight: 41.2, qualityStatus: 'Grade B', ratePerQuintal: 2090, token: 'KQ-084', dayOffset: 5, hourOffset: 6, bookingIdCode: 'KQ-2026-0011', operator: operatorProfile },
      // 4 Days Ago
      { farmerIndex: 1, centre: centres[1], slot: hadapsarSlots[0], cropType: 'Cotton', approxQuantity: 48.0, actualWeight: 46.5, qualityStatus: 'Grade A', ratePerQuintal: 6620, token: 'KQ-H-085', dayOffset: 4, hourOffset: 3, bookingIdCode: 'KQ-2026-0012', operator: operatorProfile2 },
      { farmerIndex: 0, centre: centres[2], slot: wagholiSlots[1], cropType: 'Wheat', approxQuantity: 36.0, actualWeight: 35.0, qualityStatus: 'Grade A', ratePerQuintal: 2275, token: 'KQ-W-086', dayOffset: 4, hourOffset: 5, bookingIdCode: 'KQ-2026-0013', operator: operatorProfile },
      // 3 Days Ago
      { farmerIndex: 2, centre: targetCentre, slot: kharadiSlots[4], cropType: 'Paddy (Rice)', approxQuantity: 50.0, actualWeight: 48.8, qualityStatus: 'Grade A', ratePerQuintal: 2183, token: 'KQ-087', dayOffset: 3, hourOffset: 2, bookingIdCode: 'KQ-2026-0014', operator: operatorProfile },
      { farmerIndex: 3, centre: centres[1], slot: hadapsarSlots[3], cropType: 'Soybean', approxQuantity: 38.0, actualWeight: 37.0, qualityStatus: 'Grade A', ratePerQuintal: 4600, token: 'KQ-H-088', dayOffset: 3, hourOffset: 6, bookingIdCode: 'KQ-2026-0015', operator: operatorProfile2 },
      // 2 Days Ago
      { farmerIndex: 4, centre: centres[2], slot: wagholiSlots[3], cropType: 'Cotton', approxQuantity: 52.0, actualWeight: 50.5, qualityStatus: 'Grade A', ratePerQuintal: 6620, token: 'KQ-W-089', dayOffset: 2, hourOffset: 3, bookingIdCode: 'KQ-2026-0016', operator: operatorProfile },
      { farmerIndex: 5, centre: targetCentre, slot: kharadiSlots[6], cropType: 'Maize', approxQuantity: 45.0, actualWeight: 44.0, qualityStatus: 'Grade A', ratePerQuintal: 2090, token: 'KQ-090', dayOffset: 2, hourOffset: 5, bookingIdCode: 'KQ-2026-0017', operator: operatorProfile },
      // Yesterday (1 Day Ago)
      { farmerIndex: 6, centre: centres[1], slot: hadapsarSlots[4], cropType: 'Wheat', approxQuantity: 44.0, actualWeight: 43.0, qualityStatus: 'Grade A', ratePerQuintal: 2275, token: 'KQ-H-091', dayOffset: 1, hourOffset: 4, bookingIdCode: 'KQ-2026-0018', operator: operatorProfile2 },
      { farmerIndex: 7, centre: centres[2], slot: wagholiSlots[4], cropType: 'Paddy (Rice)', approxQuantity: 46.0, actualWeight: 45.0, qualityStatus: 'Grade B', ratePerQuintal: 2183, token: 'KQ-W-092', dayOffset: 1, hourOffset: 6, bookingIdCode: 'KQ-2026-0019', operator: operatorProfile }
    ];

    console.log('Seeding 12 additional historical completed procurements & payments across 7-day period...');
    for (const hp of pastDaysProcurementsData) {
      const farmer = dummyFarmers[hp.farmerIndex];
      const completedTime = new Date(Date.now() - (hp.dayOffset * 86400000 + hp.hourOffset * 3600000));
      const dateStr = completedTime.toISOString().split('T')[0];

      const booking = await Booking.create({
        bookingId: hp.bookingIdCode,
        farmerId: farmer._id,
        centreId: hp.centre._id,
        slotId: hp.slot._id,
        cropType: hp.cropType,
        approxQuantity: hp.approxQuantity,
        tokenNumber: hp.token,
        date: dateStr,
        status: 'COMPLETED',
        createdAt: new Date(completedTime.getTime() - 40 * 60000),
        updatedAt: completedTime
      });

      const totalAmount = hp.actualWeight * hp.ratePerQuintal;

      const proc = await Procurement.create({
        bookingId: booking._id,
        farmerId: farmer._id,
        centreId: hp.centre._id,
        actualWeight: hp.actualWeight,
        qualityStatus: hp.qualityStatus,
        ratePerQuintal: hp.ratePerQuintal,
        totalAmount,
        operatorId: hp.operator._id,
        timestamp: completedTime,
        createdAt: completedTime,
        updatedAt: completedTime
      });

      await Payment.create({
        procurementId: proc._id,
        farmerId: farmer._id,
        amount: totalAmount,
        status: 'COMPLETED',
        transactionId: `TXN-SEED${Math.floor(200000 + Math.random() * 700000)}`,
        createdAt: completedTime,
        updatedAt: completedTime
      });
    }

    // 5B. Seed Live Queue for Kharadi Mandi (5 total: 1 SERVING + 4 WAITING)
    console.log('Seeding distinct live queue scenarios across all 3 centres...');
    const kharadiQueueData = [
      { farmerIndex: 1, token: 'KQ-119', status: 'SERVING', pos: 0, waitEst: 0, crop: 'Paddy (Rice)', quant: 50 },
      { farmerIndex: 2, token: 'KQ-120', status: 'WAITING', pos: 1, waitEst: 8, crop: 'Wheat', quant: 30 },
      { farmerIndex: 3, token: 'KQ-121', status: 'WAITING', pos: 2, waitEst: 16, crop: 'Soybean', quant: 25 },
      { farmerIndex: 4, token: 'KQ-122', status: 'WAITING', pos: 3, waitEst: 24, crop: 'Cotton', quant: 60 },
      { farmerIndex: 5, token: 'KQ-123', status: 'WAITING', pos: 4, waitEst: 32, crop: 'Soybean', quant: 28 } // +1 additional active queue
    ];

    for (let i = 0; i < kharadiQueueData.length; i++) {
      const lq = kharadiQueueData[i];
      const df = dummyFarmers[lq.farmerIndex];
      const slot = kharadiSlots[Math.min(i + 2, kharadiSlots.length - 1)];

      const booking = await Booking.create({
        bookingId: `KQ-${new Date().getFullYear()}-002${i + 1}`,
        farmerId: df._id,
        centreId: targetCentre._id,
        slotId: slot._id,
        cropType: lq.crop,
        approxQuantity: lq.quant,
        tokenNumber: lq.token,
        date: todayStr,
        status: lq.status === 'SERVING' ? 'PROCESSING' : 'IN_QUEUE'
      });

      slot.bookedCount += 1;
      await slot.save();

      await Queue.create({
        centreId: targetCentre._id,
        bookingId: booking._id,
        tokenNumber: lq.token,
        position: lq.pos,
        status: lq.status,
        arrivalTime: new Date(Date.now() - (60000 * 20 * (5 - i))),
        estimatedWaitTime: lq.waitEst
      });
    }

    // 5C. Seed Live Queue for Hadapsar Grain Hub (4 total: 1 SERVING + 3 WAITING)
    const hadapsarCentre = centres[1];
    const hadapsarQueueData = [
      { farmerIndex: 2, token: 'KQ-H-101', status: 'SERVING', pos: 0, waitEst: 0, crop: 'Wheat', quant: 40 },
      { farmerIndex: 3, token: 'KQ-H-102', status: 'WAITING', pos: 1, waitEst: 5, crop: 'Paddy (Rice)', quant: 35 },
      { farmerIndex: 6, token: 'KQ-H-103', status: 'WAITING', pos: 2, waitEst: 12, crop: 'Wheat', quant: 35 }, // +1 additional active queue
      { farmerIndex: 7, token: 'KQ-H-104', status: 'WAITING', pos: 3, waitEst: 20, crop: 'Cotton', quant: 42 }  // +1 additional active queue
    ];

    for (let i = 0; i < hadapsarQueueData.length; i++) {
      const lq = hadapsarQueueData[i];
      const df = dummyFarmers[lq.farmerIndex];
      const slot = hadapsarSlots[Math.min(i + 1, hadapsarSlots.length - 1)];

      const booking = await Booking.create({
        bookingId: `KQ-${new Date().getFullYear()}-003${i + 1}`,
        farmerId: df._id,
        centreId: hadapsarCentre._id,
        slotId: slot._id,
        cropType: lq.crop,
        approxQuantity: lq.quant,
        tokenNumber: lq.token,
        date: todayStr,
        status: lq.status === 'SERVING' ? 'PROCESSING' : 'IN_QUEUE'
      });

      slot.bookedCount += 1;
      await slot.save();

      await Queue.create({
        centreId: hadapsarCentre._id,
        bookingId: booking._id,
        tokenNumber: lq.token,
        position: lq.pos,
        status: lq.status,
        arrivalTime: new Date(Date.now() - (60000 * 15 * (4 - i))),
        estimatedWaitTime: lq.waitEst
      });
    }

    // 5D. Seed Live Queue for Wagholi Cooperative Mandi (7 total: 1 SERVING + 6 WAITING)
    const wagholiCentre = centres[2];

    const wagholiQueueData = [
      { farmerIndex: 0, token: 'KQ-W-201', status: 'SERVING', pos: 0, waitEst: 0, crop: 'Cotton', quant: 45 },
      { farmerIndex: 1, token: 'KQ-W-202', status: 'WAITING', pos: 1, waitEst: 15, crop: 'Wheat', quant: 30 },
      { farmerIndex: 2, token: 'KQ-W-203', status: 'WAITING', pos: 2, waitEst: 28, crop: 'Soybean', quant: 35 },
      { farmerIndex: 3, token: 'KQ-W-204', status: 'WAITING', pos: 3, waitEst: 42, crop: 'Maize', quant: 40 },
      { farmerIndex: 4, token: 'KQ-W-205', status: 'WAITING', pos: 4, waitEst: 55, crop: 'Wheat', quant: 50 },
      { farmerIndex: 0, token: 'KQ-W-206', status: 'WAITING', pos: 5, waitEst: 68, crop: 'Paddy (Rice)', quant: 45 },
      { farmerIndex: 1, token: 'KQ-W-207', status: 'WAITING', pos: 6, waitEst: 80, crop: 'Cotton', quant: 55 }
    ];

    for (let i = 0; i < wagholiQueueData.length; i++) {
      const lq = wagholiQueueData[i];
      const df = dummyFarmers[lq.farmerIndex];
      const slot = wagholiSlots[Math.min(i, wagholiSlots.length - 1)];

      const booking = await Booking.create({
        bookingId: `KQ-${new Date().getFullYear()}-004${i + 1}`,
        farmerId: df._id,
        centreId: wagholiCentre._id,
        slotId: slot._id,
        cropType: lq.crop,
        approxQuantity: lq.quant,
        tokenNumber: lq.token,
        date: todayStr,
        status: lq.status === 'SERVING' ? 'PROCESSING' : 'IN_QUEUE'
      });

      slot.bookedCount += 1;
      await slot.save();

      await Queue.create({
        centreId: wagholiCentre._id,
        bookingId: booking._id,
        tokenNumber: lq.token,
        position: lq.pos,
        status: lq.status,
        arrivalTime: new Date(Date.now() - (60000 * 25 * (7 - i))),
        estimatedWaitTime: lq.waitEst
      });
    }

    console.log('Seeded active queues:');
    console.log('  Kharadi Mandi:   1 SERVING + 4 WAITING (Moderate)');
    console.log('  Hadapsar Hub:    1 SERVING + 3 WAITING (Normal/Optimal)');
    console.log('  Wagholi Mandi:   1 SERVING + 6 WAITING (High Congestion/Bottleneck)');

    // 5E. Seed Scheduled/Booked Active Bookings (Patil + 3 additional scheduled bookings)
    const patilSlot = kharadiSlots[5]; // Afternoon slot e.g. 11:30 AM
    await Booking.create({
      bookingId: `KQ-${new Date().getFullYear()}-0124`,
      farmerId: farmerProfile._id,
      centreId: targetCentre._id,
      slotId: patilSlot._id,
      cropType: 'Wheat',
      approxQuantity: 48.5,
      tokenNumber: 'KQ-124',
      date: todayStr,
      status: 'BOOKED'
    });
    patilSlot.bookedCount += 1;
    await patilSlot.save();

    // 3 Additional Active BOOKED Bookings for upcoming dates/slots
    const tomorrowSlots = allSlots.filter(s => s.date === tomorrowStr);
    const book1Slot = tomorrowSlots.find(s => s.centreId.toString() === targetCentre._id.toString()) || kharadiSlots[8];
    const book2Slot = tomorrowSlots.find(s => s.centreId.toString() === wagholiCentre._id.toString()) || wagholiSlots[5];
    const book3Slot = tomorrowSlots.find(s => s.centreId.toString() === hadapsarCentre._id.toString()) || hadapsarSlots[6];

    await Booking.create({
      bookingId: `KQ-${new Date().getFullYear()}-0125`,
      farmerId: dummyFarmers[6]._id, // Sunita
      centreId: targetCentre._id,
      slotId: book1Slot._id,
      cropType: 'Paddy (Rice)',
      approxQuantity: 40.0,
      tokenNumber: 'KQ-125',
      date: tomorrowStr,
      status: 'BOOKED'
    });
    book1Slot.bookedCount += 1;
    await book1Slot.save();

    await Booking.create({
      bookingId: `KQ-${new Date().getFullYear()}-0126`,
      farmerId: dummyFarmers[5]._id, // Jadhav
      centreId: wagholiCentre._id,
      slotId: book2Slot._id,
      cropType: 'Maize',
      approxQuantity: 32.0,
      tokenNumber: 'KQ-W-208',
      date: tomorrowStr,
      status: 'BOOKED'
    });
    book2Slot.bookedCount += 1;
    await book2Slot.save();

    await Booking.create({
      bookingId: `KQ-${new Date().getFullYear()}-0127`,
      farmerId: dummyFarmers[7]._id, // Gaikwad
      centreId: hadapsarCentre._id,
      slotId: book3Slot._id,
      cropType: 'Wheat',
      approxQuantity: 50.0,
      tokenNumber: 'KQ-H-105',
      date: tomorrowStr,
      status: 'BOOKED'
    });
    book3Slot.bookedCount += 1;
    await book3Slot.save();

    console.log(`Seeded active BOOKED appointments: KQ-124 (Patil), KQ-125 (Sunita), KQ-W-208 (Jadhav), KQ-H-105 (Gaikwad)`);

    // 6. Seed Notifications (2 original + 6 additional = 8 total)
    await Notification.create([
      {
        userId: farmerUser._id,
        title: 'Booking Confirmed',
        message: 'Your slot booking at Kharadi Mandi Centre is confirmed. Token: KQ-124.',
        type: 'SLOT_BOOKED'
      },
      {
        userId: farmerUser._id,
        title: 'Welcome to KisanQueue',
        message: 'Manage and track your crop procurement slots online in your preferred language.',
        type: 'ALERT'
      },
      // 6 Additional Notifications
      {
        userId: dummyFarmers[5].userId,
        title: 'Slot Confirmed',
        message: 'Your slot booking at Kharadi Mandi is confirmed for Soybean. Token: KQ-123.',
        type: 'SLOT_BOOKED'
      },
      {
        userId: dummyFarmers[6].userId,
        title: 'Queue Position Update',
        message: 'Your token KQ-H-103 is at position 2 in Hadapsar Grain Hub.',
        type: 'TURN_APPROACHING'
      },
      {
        userId: dummyFarmers[7].userId,
        title: 'Slot Confirmed',
        message: 'Your appointment at Hadapsar Grain Hub is booked. Token: KQ-H-104.',
        type: 'SLOT_BOOKED'
      },
      {
        userId: farmerUser._id,
        title: 'Procurement Payment Processed',
        message: 'Payment of ₹87,780 for Maize procurement has been credited via Direct Benefit Transfer.',
        type: 'PAYMENT_PROCESSED'
      },
      {
        userId: dummyFarmers[1].userId,
        title: 'Weighment Completed',
        message: 'Cotton procurement weighment of 46.5 Qtl verified (Grade A).',
        type: 'PROCUREMENT_COMPLETED'
      },
      {
        userId: dummyFarmers[2].userId,
        title: 'MSP Rate Update',
        message: 'Paddy MSP rate for Grade A is ₹2,183/Qtl at Kharadi Mandi Centre.',
        type: 'ALERT'
      }
    ]);

    // Collection Counts Validation & Report
    const counts = {
      users: await User.countDocuments(),
      farmers: await Farmer.countDocuments(),
      operators: await Operator.countDocuments(),
      centres: await Centre.countDocuments(),
      slots: await Slot.countDocuments(),
      bookings: await Booking.countDocuments(),
      queues: await Queue.countDocuments(),
      procurements: await Procurement.countDocuments(),
      payments: await Payment.countDocuments(),
      notifications: await Notification.countDocuments()
    };

    console.log('Seeding finished successfully.');
    console.table(counts);

    if (shouldCloseConnection) {
      await mongoose.connection.close();
      console.log('DB Connection closed.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Error during seeding:', err);
    if (shouldCloseConnection) {
      process.exit(1);
    }
  }
};

export { seedDatabase };

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase(true);
}
