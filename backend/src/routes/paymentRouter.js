import express from 'express';
import { verifyPayment, createOrder, getSubscriptionStatus, cancelSubscriptionPayment, startTrial, createAppointmentOrder, verifyAppointmentPayment, getUserAppointments, handleRazorpayWebhook } from '../controllers/payment.comtroller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/subscription-status', protect, getSubscriptionStatus);
router.post('/cancel-subscription', protect, cancelSubscriptionPayment);
router.post('/start-trial', protect, startTrial);

// Appointment routes
router.post('/create-appointment-order', protect, createAppointmentOrder);
router.post('/verify-appointment-payment', protect, verifyAppointmentPayment);
router.get('/appointments', protect, getUserAppointments);

// Webhook route - public access since it's from Razorpay
router.post('/webhook', handleRazorpayWebhook);

export default router;
