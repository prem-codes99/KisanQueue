import express from 'express';
import { getFarmerProfile, updateFarmerProfile } from '../controllers/farmerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id', protect, getFarmerProfile);
router.put('/profile', protect, updateFarmerProfile);

export default router;
