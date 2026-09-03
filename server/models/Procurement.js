import mongoose from 'mongoose';

const procurementSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
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
  actualWeight: {
    type: Number, // In Quintals (q) or kg
    required: true
  },
  qualityStatus: {
    type: String,
    enum: ['Grade A', 'Grade B', 'Grade C', 'Rejected'],
    required: true
  },
  ratePerQuintal: {
    type: Number, // Cost per unit (e.g., INR per Quintal)
    required: true
  },
  totalAmount: {
    type: Number, // Auto-calculated (actualWeight * ratePerQuintal)
    required: true
  },
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Procurement = mongoose.model('Procurement', procurementSchema);
export default Procurement;
