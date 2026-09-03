import mongoose from 'mongoose';

const operatorSchema = new mongoose.Schema({
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
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    required: true
  },
  contact: {
    type: String,
    required: true
  }
}, { timestamps: true });

const Operator = mongoose.model('Operator', operatorSchema);
export default Operator;
