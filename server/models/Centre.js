import mongoose from 'mongoose';

const centreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  centreCode: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  district: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    default: 'Maharashtra',
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    default: 50 // Maximum slots per slot-window
  },
  activeCounters: {
    type: Number,
    required: true,
    default: 2 // Serving counters for predicting queue speeds
  },
  contactNumber: {
    type: String,
    required: true
  },
  operatingHours: {
    type: String,
    default: '08:00 AM - 06:00 PM'
  },
  cropsHandled: {
    type: [String],
    default: ['Wheat', 'Paddy (Rice)', 'Cotton', 'Maize', 'Soybean']
  },
  operatorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'active', 'inactive'],
    default: 'PENDING'
  }
}, { timestamps: true });

const Centre = mongoose.model('Centre', centreSchema);
export default Centre;
