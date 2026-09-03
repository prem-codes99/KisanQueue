import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('DNS servers could not be set:', e.message);
}
dns.setDefaultResultOrder('ipv4first');

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Centre from '../models/Centre.js';
import Operator from '../models/Operator.js';
import Booking from '../models/Booking.js';
import Queue from '../models/Queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI;

const checkDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const centresCount = await Centre.countDocuments();
    const operatorsCount = await Operator.countDocuments();
    const bookingsCount = await Booking.countDocuments();
    const queuesCount = await Queue.countDocuments();

    console.log(`\n--- DB Counts ---`);
    console.log(`Centres: ${centresCount}`);
    console.log(`Operators: ${operatorsCount}`);
    console.log(`Bookings: ${bookingsCount}`);
    console.log(`Queues: ${queuesCount}`);

    const operator = await Operator.findOne({ name: 'Suhas Deshmukh' });
    console.log('\n--- Suhas Deshmukh Profile ---');
    console.log(operator);

    if (operator) {
      const centre = await Centre.findById(operator.centreId);
      console.log('\n--- Operator Centre ---');
      console.log(centre);

      const queueItems = await Queue.find({ centreId: operator.centreId });
      console.log('\n--- Queue Items at this Centre ---');
      console.log(queueItems);

      const bookings = await Booking.find({ centreId: operator.centreId });
      console.log('\n--- Bookings at this Centre ---');
      console.log(bookings.map(b => ({ id: b._id, token: b.tokenNumber, status: b.status, date: b.date })));
    }

    await mongoose.connection.close();
    console.log('\nDB connection closed.');
  } catch (err) {
    console.error('Error during check:', err);
  }
};

checkDB();
