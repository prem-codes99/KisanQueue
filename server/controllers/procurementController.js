import Procurement from '../models/Procurement.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Queue from '../models/Queue.js';
import Notification from '../models/Notification.js';
import Operator from '../models/Operator.js';

// Crop Minimum Support Price (MSP) per Quintal in INR
const cropMSPRates = {
  'Wheat': 2275,
  'Paddy (Rice)': 2183,
  'Cotton': 6620,
  'Maize': 2090,
  'Soybean': 4600
};

// Quality multiplier adjustments
const qualityMultipliers = {
  'Grade A': 1.0,
  'Grade B': 0.95,
  'Grade C': 0.85,
  'Rejected': 0.0
};

// Record weight and crop quality (procure crop)
export const createProcurement = async (req, res) => {
  try {
    const { bookingId, actualWeight, qualityStatus } = req.body;

    if (!bookingId || !actualWeight || !qualityStatus) {
      return res.status(400).json({ success: false, message: 'Please provide all verification details' });
    }

    const booking = await Booking.findById(bookingId).populate('farmerId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Get operator details
    const operator = await Operator.findOne({ userId: req.user._id });
    if (!operator) {
      return res.status(403).json({ success: false, message: 'Operator profile not found' });
    }

    // Calculate rates
    const baseRate = cropMSPRates[booking.cropType] || 2000;
    const multiplier = qualityMultipliers[qualityStatus];
    const ratePerQuintal = baseRate * multiplier;
    const totalAmount = parseFloat((actualWeight * ratePerQuintal).toFixed(2));

    // Create Procurement record
    const procurement = await Procurement.create({
      bookingId: booking._id,
      farmerId: booking.farmerId._id,
      centreId: booking.centreId,
      actualWeight,
      qualityStatus,
      ratePerQuintal,
      totalAmount,
      operatorId: operator._id
    });

    // Update Booking status
    booking.status = 'COMPLETED';
    await booking.save();

    // Remove from Live Queue
    await Queue.deleteOne({ bookingId: booking._id });

    // Initialize Payment Record
    const payment = await Payment.create({
      procurementId: procurement._id,
      farmerId: booking.farmerId._id,
      amount: totalAmount,
      status: 'PENDING'
    });

    // Notify Farmer
    await Notification.create({
      userId: booking.farmerId.userId,
      title: 'Procurement Completed',
      message: `Procurement complete: ${actualWeight} q of ${booking.cropType} (${qualityStatus}). Amount: ₹${totalAmount}. Payment initialized.`,
      type: 'PROCUREMENT_COMPLETED'
    });

    // Broadcast updated queue (since this token left the queue)
    if (global.io) {
      const remainingQueue = await Queue.find({ centreId: booking.centreId })
        .populate({ path: 'bookingId', populate: { path: 'farmerId' } })
        .sort({ position: 1 });
      global.io.to(booking.centreId.toString()).emit('queueUpdated', remainingQueue);
    }

    res.status(201).json({
      success: true,
      data: {
        procurement,
        payment
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Farmer procurement logs
export const getFarmerProcurements = async (req, res) => {
  try {
    const procurements = await Procurement.find({ farmerId: req.params.farmerId })
      .populate('bookingId')
      .populate('centreId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: procurements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
