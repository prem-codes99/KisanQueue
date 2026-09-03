import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD for easy querying
    required: true
  },
  startTime: {
    type: String, // e.g. "09:00"
    required: true
  },
  endTime: {
    type: String, // e.g. "09:30"
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    default: 10
  },
  bookedCount: {
    type: Number,
    required: true,
    default: 0
  },
  crowdLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  }
}, { timestamps: true });

// Pre-save middleware to dynamically update crowd level
slotSchema.pre('save', function(next) {
  const ratio = this.bookedCount / this.capacity;
  if (ratio >= 0.8) {
    this.crowdLevel = 'HIGH';
  } else if (ratio >= 0.4) {
    this.crowdLevel = 'MEDIUM';
  } else {
    this.crowdLevel = 'LOW';
  }
  next();
});

const Slot = mongoose.model('Slot', slotSchema);
export default Slot;
