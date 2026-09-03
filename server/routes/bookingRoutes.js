import express from 'express';
import { createBooking, getFarmerBookings, getBookingById, cancelBooking, overrideBookingStatus, getCentreBookings } from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/farmer/:farmerId', protect, getFarmerBookings);
router.get('/centre/:centreId', protect, getCentreBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/status-override', protect, overrideBookingStatus);

export default router;
