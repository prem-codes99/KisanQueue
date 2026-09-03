import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-local-testing-only';
const testPassword = 'password123';

const runTest = async () => {
  console.log('=== Auth & JWT Verification ===\n');

  // 1. Password hash verification
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    console.log(`Bcrypt Hash: ${hashedPassword}`);

    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`Password Match: ${isMatch ? '✅ MATCHED' : '❌ MISMATCH'}`);
  } catch (err) {
    console.error('Password Test Error:', err);
  }

  // 2. JWT validation
  try {
    const mockPayload = { id: '66a98fb29dfbb2e54bc2bb4f', role: 'farmer' };
    const token = jwt.sign(mockPayload, JWT_SECRET, { expiresIn: '30d' });
    console.log(`Generated Token: ${token}`);

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded Payload:');
    console.log(`  User ID: ${decoded.id}`);
    console.log(`  User Role: ${decoded.role}`);
    console.log(`JWT Status: ✅ VERIFIED`);
  } catch (err) {
    console.error('JWT Test Error:', err);
  }

  console.log('\n================================');
};

runTest();
