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

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import farmerRoutes from './routes/farmerRoutes.js';
import centreRoutes from './routes/centreRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Environment & Production flags
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables in production
if (isProduction && !process.env.JWT_SECRET) {
  console.error('Fatal: JWT_SECRET environment variable is missing in production mode.');
  process.exit(1);
}

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for prototype simplicity
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Expose io instance globally so controllers can broadcast events
global.io = io;

// Database Connection
const hasRemoteMongo = Boolean(process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('127.0.0.1'));
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisanqueue';

console.log(`Connecting to MongoDB (${isProduction ? 'Production Mode' : 'Development Mode'})...`);

try {
  // Use a 10-second timeout for remote/production MongoDB connections, 2-second for local fallback
  const timeoutMs = isProduction || hasRemoteMongo ? 10000 : 2000;
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: timeoutMs });
  console.log('Successfully connected to MongoDB.');
} catch (err) {
  if (isProduction || hasRemoteMongo) {
    console.error('Fatal: Could not connect to MongoDB in production / remote mode:', err.message);
    console.error('Please verify your MONGODB_URI environment variable and network access.');
    process.exit(1);
  }

  // In development only: fallback to in-memory database
  console.warn('Local MongoDB connection failed. Spinning up an in-memory MongoDB fallback database for development...');
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const inMemoryUri = mongoServer.getUri();
    console.log(`In-memory MongoDB instance started at: ${inMemoryUri}`);
    
    await mongoose.connect(inMemoryUri);
    console.log('Connected to in-memory database.');
    
    // Seed the database with demo accounts & slots
    console.log('Seeding in-memory database with demo accounts & slots...');
    const { seedDatabase } = await import('./utils/seed.js');
    await seedDatabase(false);
    console.log('Database seeded and ready!');
  } catch (memErr) {
    console.error('Fatal: Failed to start in-memory MongoDB fallback database:', memErr);
    process.exit(1);
  }
}

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Farmer/Operator joins a room corresponding to a procurement centre
  socket.on('joinCentre', (centreId) => {
    socket.join(centreId);
    console.log(`Socket ${socket.id} joined centre room: ${centreId}`);
  });

  socket.on('leaveCentre', (centreId) => {
    socket.leave(centreId);
    console.log(`Socket ${socket.id} left centre room: ${centreId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// API Routes Mapping
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/centres', centreRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Test DB Endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const centres = await mongoose.model('Centre').find({});
    const bookings = await mongoose.model('Booking').find({});
    const queues = await mongoose.model('Queue').find({});
    const operators = await mongoose.model('Operator').find({});
    res.json({
      success: true,
      counts: {
        centres: centres.length,
        bookings: bookings.length,
        queues: queues.length,
        operators: operators.length
      },
      centres,
      operators,
      queues,
      bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve compiled React frontend in production & handle SPA client-side routing
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start Server - Bind to 0.0.0.0 for containerized cloud deployment
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`KisanQueue API Server running on port ${PORT} (host: 0.0.0.0)`);
});
