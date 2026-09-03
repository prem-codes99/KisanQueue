import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  procurementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procurement',
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
