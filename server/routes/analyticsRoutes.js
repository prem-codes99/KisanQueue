import express from 'express';
import { 
  getAdminAnalytics, 
  getBottleneckOverview, 
  getCentreBottleneckDetails 
} from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/admin', protect, restrictTo('admin'), getAdminAnalytics);
router.get('/bottlenecks', protect, restrictTo('admin', 'operator'), getBottleneckOverview);
router.get('/centre/:centreId/bottlenecks', protect, restrictTo('admin', 'operator'), getCentreBottleneckDetails);

export default router;
