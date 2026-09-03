import Booking from '../models/Booking.js';
import Slot from '../models/Slot.js';
import Centre from '../models/Centre.js';
import Notification from '../models/Notification.js';
import Queue from '../models/Queue.js';
import Farmer from '../models/Farmer.js';

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const { farmerId, centreId, slotId, cropType, approxQuantity, date } = req.body;

    if (!farmerId || !centreId || !slotId || !cropType || !approxQuantity || !date) {
      return res.status(400).json({ success: false, message: 'Please provide all details' });
    }

    // Verify slot capacity
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Time slot not found' });
    }

    if (slot.bookedCount >= slot.capacity) {
      return res.status(400).json({ success: false, message: 'Selected time slot is fully booked. Please select another slot.' });
    }

    // Generate guaranteed unique Booking ID
    const year = new Date().getFullYear();
    let bookingId = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const candidateId = `KQ-${year}-${randomSuffix}`;
      const existing = await Booking.findOne({ bookingId: candidateId });
      if (!existing) {
        bookingId = candidateId;
        isUnique = true;
      }
    }

    if (!bookingId) {
      bookingId = `KQ-${year}-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    }

    // Generate Token Number for the day at this centre
    const dayBookingsCount = await Booking.countDocuments({ centreId, date });
    const tokenNumber = `KQ-${String(dayBookingsCount + 1).padStart(3, '0')}`;

    // Create Booking
    const booking = await Booking.create({
      bookingId,
      farmerId,
      centreId,
      slotId,
      cropType,
      approxQuantity,
      tokenNumber,
      date,
      status: 'BOOKED'
    });

    // Update slot booking count
    slot.bookedCount += 1;
    await slot.save();

    // Create Notification
    const centre = await Centre.findById(centreId);
    await Notification.create({
      userId: req.user._id,
      title: 'Slot Booked Successfully',
      message: `Your booking at ${centre.name} on ${date} for ${slot.startTime}-${slot.endTime} is confirmed. Token Number: ${tokenNumber}.`,
      type: 'SLOT_BOOKED'
    });

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get farmer bookings history
export const getFarmerBookings = async (req, res) => {
  try {
    let queryFarmerId = req.params.farmerId;
    
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

    const bookings = await Booking.find({ farmerId: queryFarmerId })
      .populate('centreId')
      .populate('slotId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single booking status
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('centreId')
      .populate('slotId')
      .populate('farmerId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    // Decrement slot bookedCount
    const slot = await Slot.findById(booking.slotId);
    if (slot) {
      slot.bookedCount = Math.max(0, slot.bookedCount - 1);
      await slot.save();
    }

    // Create Notification
    await Notification.create({
      userId: req.user._id,
      title: 'Booking Cancelled',
      message: `Your booking for Token ${booking.tokenNumber} has been successfully cancelled.`,
      type: 'ALERT'
    });

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Force status override (Admin / demo control)
export const overrideBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();

    // Side-effects for live queue entries
    if (status === 'ARRIVED') {
      const existing = await Queue.findOne({ bookingId: booking._id });
      if (!existing) {
        const count = await Queue.countDocuments({ centreId: booking.centreId, status: 'WAITING' });
        await Queue.create({
          centreId: booking.centreId,
          bookingId: booking._id,
          tokenNumber: booking.tokenNumber,
          position: count + 1,
          status: 'WAITING'
        });
      }
    } else if (status === 'PROCESSING') {
      const existing = await Queue.findOne({ bookingId: booking._id });
      if (existing) {
        existing.status = 'SERVING';
        existing.position = 0;
        await existing.save();
      }
    } else if (['COMPLETED', 'CANCELLED', 'NOSHOW'].includes(status)) {
      await Queue.deleteOne({ bookingId: booking._id });
    }

    // Broadcast queue update via socket
    if (global.io) {
      const remainingQueue = await Queue.find({ centreId: booking.centreId })
        .populate({ path: 'bookingId', populate: { path: 'farmerId' } })
        .sort({ position: 1 });
      global.io.to(booking.centreId.toString()).emit('queueUpdated', remainingQueue);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get bookings for a specific centre
export const getCentreBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ centreId: req.params.centreId })
      .populate('farmerId')
      .populate('slotId')
      .sort({ date: 1, tokenNumber: 1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
