import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisanqueue';

console.log('Testing connection to:', MONGO_URI);
console.log('Timeout set to 5000ms');

try {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('SUCCESSFULLY CONNECTED!');
  await mongoose.disconnect();
} catch (err) {
  console.error('CONNECTION FAILED:', err);
}
