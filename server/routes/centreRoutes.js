import express from 'express';
import { 
  getAllCentres, 
  getCentreById, 
  createCentre, 
  updateCentre,
  getCentreRequests,
  approveCentre,
  rejectCentre
} from '../controllers/centreController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getAllCentres);

// Admin-only Centre Request & Management Endpoints
router.get('/requests', protect, restrictTo('admin'), getCentreRequests);
router.put('/:id/approve', protect, restrictTo('admin'), approveCentre);
router.put('/:id/reject', protect, restrictTo('admin'), rejectCentre);

router.get('/:id', protect, getCentreById);
router.post('/', protect, restrictTo('admin'), createCentre);
router.put('/:id', protect, restrictTo('admin'), updateCentre);

export default router;
