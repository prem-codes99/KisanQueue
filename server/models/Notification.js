import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: [
      'SLOT_BOOKED',
      'REMINDER',
      'TURN_APPROACHING',
      'CALLED',
      'PROCUREMENT_COMPLETED',
      'PAYMENT_PROCESSED',
      'ALERT'
    ],
    required: true
  }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
