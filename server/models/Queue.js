import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema({
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  tokenNumber: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['WAITING', 'SERVING', 'COMPLETED', 'NOSHOW'],
    default: 'WAITING'
  },
  arrivalTime: {
    type: Date,
    default: Date.now
  },
  estimatedWaitTime: {
    type: Number, // In minutes
    default: 0
  }
}, { timestamps: true });

const Queue = mongoose.model('Queue', queueSchema);
export default Queue;
