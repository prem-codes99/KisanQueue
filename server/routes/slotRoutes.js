import express from 'express';
import { getSlotsByCentreAndDate, getSmartQueueAdvisor, batchGenerateSlots } from '../controllers/slotController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getSlotsByCentreAndDate);
router.get('/advisor', protect, getSmartQueueAdvisor);
router.post('/generate', protect, restrictTo('admin'), batchGenerateSlots);

export default router;
