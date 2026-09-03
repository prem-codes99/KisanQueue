import express from 'express';
import { getCentreQueue, getFarmerLiveQueue, markArrived, callNext, markNoShow } from '../controllers/queueController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/centre/:centreId', protect, getCentreQueue);
router.get('/live/:bookingId', protect, getFarmerLiveQueue);

// Operator only actions
router.post('/mark-arrived', protect, restrictTo('operator'), markArrived);
router.post('/call-next', protect, restrictTo('operator'), callNext);
router.post('/no-show', protect, restrictTo('operator'), markNoShow);

export default router;
