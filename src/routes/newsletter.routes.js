import express from 'express';
import { subscribe, unsubscribe, verifySubscription } from '../controllers/newsletter.controller.js';

const router = express.Router();

// Subscribe to newsletter (public)
router.post('/subscribe', subscribe);

// Unsubscribe from newsletter (public)
router.post('/unsubscribe', unsubscribe);

// Verify email subscription (public)
router.get('/verify/:token', verifySubscription);

export default router;