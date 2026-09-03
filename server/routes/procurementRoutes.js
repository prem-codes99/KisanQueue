import express from 'express';
import { createProcurement, getFarmerProcurements } from '../controllers/procurementController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/farmer/:farmerId', protect, getFarmerProcurements);

// Operator action
router.post('/', protect, restrictTo('operator'), createProcurement);

export default router;
