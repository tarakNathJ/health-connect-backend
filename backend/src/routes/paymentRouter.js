import express from 'express';
import { verifyPayment, createOrder, getSubscriptionStatus, cancelSubscriptionPayment, startTrial } from '../controllers/payment.comtroller.js';
import { protect } from '../middleware/authMiddleware.js';


const router = express.Router();


router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/subscription-status', protect, getSubscriptionStatus);
router.post('/cancel-subscription', protect, cancelSubscriptionPayment);
router.post('/start-trial', protect, startTrial);

export default router;
