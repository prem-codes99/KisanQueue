import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true
  },
  farmerId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  village: {
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
    required: true,
    trim: true
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'hi', 'mr'],
    default: 'en'
  }
}, { timestamps: true });

const Farmer = mongoose.model('Farmer', farmerSchema);
export default Farmer;
