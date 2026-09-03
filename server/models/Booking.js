import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    required: true
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: true
  },
  cropType: {
    type: String,
    required: true
  },
  approxQuantity: {
    type: Number, // In Quintals (q)
    required: true
  },
  tokenNumber: {
    type: String, // e.g. "KQ-104"
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    enum: ['BOOKED', 'ARRIVED', 'IN_QUEUE', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'NOSHOW'],
    default: 'BOOKED'
  }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
