import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Farmer from '../models/Farmer.js';

// Update payment status (Operator or Admin action)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Please provide status' });
    }

    const payment = await Payment.findById(req.params.id).populate('farmerId');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    payment.status = status;

    if (status === 'COMPLETED') {
      // Generate a mock transaction ID
      payment.transactionId = `TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    }

    await payment.save();

    // Notify farmer
    await Notification.create({
      userId: payment.farmerId.userId,
      title: 'Payment Status Updated',
      message: `Your payment of ₹${payment.amount} has been marked as ${status}.${payment.transactionId ? ' Reference ID: ' + payment.transactionId : ''}`,
      type: 'PAYMENT_PROCESSED'
    });

    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get payments for a farmer
export const getFarmerPayments = async (req, res) => {
  try {
    let queryFarmerId = req.params.farmerId;
    
    // Support querying all payments for operators/admins
    if (queryFarmerId === 'all') {
      const payments = await Payment.find({})
        .populate('farmerId')
        .populate({
          path: 'procurementId',
          populate: [
            { path: 'bookingId', populate: [{ path: 'centreId' }, { path: 'slotId' }] },
            { path: 'centreId' },
            { path: 'operatorId' }
          ]
        })
        .sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: payments });
    }
    
    // Check if parameter is a 24-character hex ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(queryFarmerId);
    if (!isObjectId) {
      // Find farmer by mobile number or farmerId string
      const farmer = await Farmer.findOne({
        $or: [
          { mobileNumber: queryFarmerId },
          { farmerId: queryFarmerId }
        ]
      });
      if (farmer) {
        queryFarmerId = farmer._id;
      } else {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    const payments = await Payment.find({ farmerId: queryFarmerId })
      .populate('farmerId')
      .populate({
        path: 'procurementId',
        populate: [
          { path: 'bookingId', populate: [{ path: 'centreId' }, { path: 'slotId' }] },
          { path: 'centreId' },
          { path: 'operatorId' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
