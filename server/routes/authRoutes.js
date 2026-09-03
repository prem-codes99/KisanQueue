import express from 'express';
import { register, registerCentre, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/register-centre', registerCentre);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;
