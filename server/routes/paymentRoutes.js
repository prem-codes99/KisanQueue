import express from 'express';
import { getFarmerPayments, updatePaymentStatus } from '../controllers/paymentController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/farmer/:farmerId', protect, getFarmerPayments);

// Operator/Admin actions
router.put('/:id/status', protect, restrictTo('operator', 'admin'), updatePaymentStatus);

export default router;
