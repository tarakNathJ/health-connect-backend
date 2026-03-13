// backend/src/controllers/payment.controller.js

import crypto from 'crypto';

import Payment from '../models/Payment.module.js';
import User from '../models/User.js';
import razorpay from '../utils/razorpayinstance.js';
import Subscription from '../models/subscription.module.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/DoctorProfile.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Helper to map our frontend billing cycles to Razorpay's required period/interval.
 */
const getRazorpayPeriodAndInterval = (cycle) => {
    switch (cycle) {
        case 'weekly': return { period: 'weekly', interval: 1 };
        case 'monthly': return { period: 'monthly', interval: 1 };
        case 'sixMonths': return { period: 'monthly', interval: 6 };
        case 'yearly': return { period: 'yearly', interval: 1 };
        default: return { period: 'monthly', interval: 1 };
    }
};

/**
 * @desc    Create a new Razorpay subscription and save initial records in the database.
 * @route   POST /api/payment/create-order
 * @access  Private (Requires user to be logged in)
 */
export const createOrder = async (req, res) => {
    const { amount, duration, plan, billingCycle } = req.body;

    try {
        // --- VALIDATION ---
        console.log('Creating order with amount:', amount, 'duration:', duration, 'plan:', plan, 'billingCycle:', billingCycle);

        if (!amount || !duration || !plan) {
            return res.status(400).json({ success: false, message: 'Missing required fields: amount, duration, and plan are required.' });
        }

        if (amount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // We no longer aggressively cancel existing subscriptions here. 
        // We do it in verifyPayment only upon successful checkout.

        // --- ATTEMPT TRUE SUBSCRIPTION, FALLBACK TO ORDER ---
        let checkoutResp = null;
        let isSubscription = false;

        try {
            const { period, interval } = getRazorpayPeriodAndInterval(billingCycle);
            let planId = null;

            // Fetch or create plan
            const plans = await razorpay.plans.all();
            const existingPlan = plans.items.find(p =>
                p.item.amount === amount * 100 &&
                p.item.currency === 'INR' &&
                p.period === period &&
                p.interval === interval &&
                p.item.name === `MediBridge ${plan} ${billingCycle}`
            );

            if (existingPlan) {
                planId = existingPlan.id;
            } else {
                const newPlan = await razorpay.plans.create({
                    period: period,
                    interval: interval,
                    item: {
                        name: `MediBridge ${plan} ${billingCycle}`,
                        amount: amount * 100,
                        currency: 'INR',
                        description: `MediBridge ${plan} Tier (${billingCycle})`
                    }
                });
                planId = newPlan.id;
            }

            // Create subscription
            const subOptions = {
                plan_id: planId,
                customer_notify: 1,
                total_count: 60,
            };
            checkoutResp = await razorpay.subscriptions.create(subOptions);
            isSubscription = true;

        } catch (planError) {
            console.warn('Razorpay Subscriptions API restricted. Falling back to Standard Orders:', planError.error?.description || planError.message);
            // --- FALLBACK LOGIC ---
            const options = {
                amount: amount * 100, // Amount in paise
                currency: 'INR',
                receipt: `receipt_${Date.now()}`,
                payment_capture: 1,
            };
            checkoutResp = await razorpay.orders.create(options);
            isSubscription = false;
        }

        // Save payment record
        const payment = new Payment({
            userId: req.user._id,
            amount: amount,
            currency: "INR",
            OrderId: checkoutResp.id, // Storing sub ID or Order ID
            status: 'pending',
        });
        await payment.save();

        // Create subscription record (inactive until payment verified)
        const subscription = new Subscription({
            userId: req.user._id,
            plan: plan,
            billingCycle: billingCycle || 'monthly',
            amount: amount,
            endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000), // Pre-populate, but true date verified in verifyPayment
            status: 'inactive',
            paymentId: payment._id,
            razorpayOrderId: checkoutResp.id, // Using this field to store Razorpay ID
        });
        await subscription.save();

        res.status(200).json({
            success: true,
            order: checkoutResp, // Returning as `order` so the frontend doesn't break
            paymentId: payment._id,
            subscriptionId: subscription._id,
            message: isSubscription ? 'Subscription created successfully' : 'Order created successfully',
            isSubscription: isSubscription
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message,
        });
    }
};

/**
 * @desc    Verify payment signature and activate subscription.
 * @route   POST /api/payment/verify-payment
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
    const { razorpay_subscription_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId, subscriptionId } = req.body;

    console.log('Verifying payment:', { razorpay_subscription_id, razorpay_order_id, razorpay_payment_id, paymentId, subscriptionId });

    try {
        if ((!razorpay_subscription_id && !razorpay_order_id) || !razorpay_payment_id || !razorpay_signature || !paymentId || !subscriptionId) {
            return res.status(400).json({ success: false, message: 'Missing required fields for verification' });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription record not found' });
        }

        // Verify signature: It differs based on order vs subscription
        let body;
        if (razorpay_subscription_id) {
            body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
        } else {
            body = `${razorpay_order_id}|${razorpay_payment_id}`;
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            payment.status = 'failed';
            await payment.save();
            subscription.status = 'cancelled';
            await subscription.save();
            return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
        }

        // --- SUCCESS ---

        // Update payment
        payment.paymentId = razorpay_payment_id;
        payment.status = 'completed';
        payment.signature = razorpay_signature;
        await payment.save();

        // Cancel any existing active subscriptions for this user before activating the new one
        await Subscription.updateMany(
            { userId: req.user._id, status: 'active', _id: { $ne: subscriptionId } },
            { $set: { status: 'cancelled', cancelledAt: new Date() } }
        );

        // Activate new subscription
        subscription.status = 'active';
        subscription.startDate = new Date();
        subscription.razorpayPaymentId = razorpay_payment_id;
        await subscription.save();

        // Calculate credits to grant based on billing cycle
        let creditsToGrant = 0;
        if (subscription.plan === 'pro') {
            switch (subscription.billingCycle) {
                case 'weekly': creditsToGrant = 1; break;
                case 'monthly': creditsToGrant = 2; break;
                case 'sixMonths': creditsToGrant = 15; break;
                case 'yearly': creditsToGrant = 30; break;
                default: creditsToGrant = 2; break; // fallback
            }
        }

        // Update user tier and add appointment credits
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { 
                $set: { tier: subscription.plan },
                $inc: { appointmentCredits: creditsToGrant } 
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({ success: false, message: 'Failed to update user plan' });
        }

        // Return subscription details so frontend can display them
        const daysLeft = Math.max(0, Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24)));

        res.status(200).json({
            success: true,
            message: 'Payment verified and subscription activated successfully',
            tier: subscription.plan,
            appointmentCredits: updatedUser.appointmentCredits,
            subscription: {
                plan: subscription.plan,
                billingCycle: subscription.billingCycle,
                amount: subscription.amount,
                currency: 'INR',
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                daysLeft: daysLeft,
                status: subscription.status,
            }
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message,
        });
    }
};

/**
 * @desc    Get current active subscription for logged-in user
 * @route   GET /api/payment/subscription-status
 * @access  Private
 */
export const getSubscriptionStatus = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Find the most recent active subscription for this user
        const subscription = await Subscription.findOne({
            userId: req.user._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        const user = await User.findById(req.user._id);

        if (!subscription) {
            return res.status(200).json({
                success: true,
                subscription: null,
                tier: req.user.tier || 'free',
                appointmentCredits: user ? user.appointmentCredits : 0,
            });
        }

        // Check if subscription has expired
        const now = new Date();
        if (subscription.endDate && now > subscription.endDate) {
            // Auto-expire the subscription
            subscription.status = 'expired';
            await subscription.save();

            // Downgrade user to free
            await User.findByIdAndUpdate(req.user._id, { tier: 'free' });

            return res.status(200).json({
                success: true,
                subscription: null,
                tier: 'free',
                message: 'Your subscription has expired.',
            });
        }

        const daysLeft = Math.max(0, Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24)));

        res.status(200).json({
            success: true,
            subscription: {
                plan: subscription.plan,
                billingCycle: subscription.billingCycle,
                amount: subscription.amount,
                currency: 'INR',
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                daysLeft: daysLeft,
                status: subscription.status,
            },
            tier: subscription.plan,
            appointmentCredits: user ? user.appointmentCredits : 0,
        });

    } catch (error) {
        console.error('Error getting subscription status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get subscription status',
            error: error.message,
        });
    }
};

/**
 * @desc    Cancel the active subscription
 * @route   POST /api/payment/cancel-subscription
 * @access  Private
 */
export const cancelSubscriptionPayment = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Find active subscription
        const subscription = await Subscription.findOne({
            userId: req.user._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'No active subscription found' });
        }

        // Cancel the subscription in our database
        subscription.status = 'cancelled';
        await subscription.save();

        // Downgrade user to free
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { tier: 'free' },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully. You have been moved to the Free tier.',
            tier: 'free',
            appointmentCredits: updatedUser.appointmentCredits,
        });

    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: error.message,
        });
    }
};

/**
 * @desc    Start a 3-day free Pro trial (one per user, enforced on the server)
 * @route   POST /api/payment/start-trial
 * @access  Private
 */
export const startTrial = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // SECURITY: Check if this user has EVER had a trial (in the database)
        const existingTrial = await Subscription.findOne({
            userId: req.user._id,
            billingCycle: 'trial',
        });

        if (existingTrial) {
            return res.status(400).json({
                success: false,
                message: 'You have already used your free trial. Please choose a paid plan.',
                trialAlreadyUsed: true,
            });
        }

        // Create a 3-day trial subscription record
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 3);

        const subscription = new Subscription({
            userId: req.user._id,
            plan: 'pro',
            billingCycle: 'trial',
            amount: 0,
            startDate: new Date(),
            endDate: trialEndDate,
            status: 'active',
        });
        await subscription.save();

        // Upgrade user tier to pro and grant 1 trial credit
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id, 
            { 
                $set: { tier: 'pro' },
                $inc: { appointmentCredits: 1 } 
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: '3-day Pro trial started successfully! 1 Free Consultation Credit has been added to your account.',
            tier: 'pro',
            appointmentCredits: updatedUser.appointmentCredits,
            subscription: {
                plan: 'pro',
                billingCycle: 'trial',
                startDate: subscription.startDate,
                endDate: trialEndDate,
                daysLeft: 3,
                status: 'active',
            },
        });

    } catch (error) {
        console.error('Error starting trial:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start trial',
            error: error.message,
        });
    }
};

// ─── Appointment Payment Controllers ────────────────────────────────────────

/**
 * @desc    Create a ₹300 Razorpay order for a single appointment booking.
 *          Only Lite and Pro users can call this. Free users get 403.
 *          Pro users bypass payment (appointment is free with subscription).
 * @route   POST /api/payment/create-appointment-order
 * @access  Private
 */
export const createAppointmentOrder = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { doctorId, appointmentDate, doctorName } = req.body;
        if (!doctorId || !appointmentDate) {
            return res.status(400).json({ message: 'doctorId and appointmentDate are required' });
        }

        // ── Tier enforcement ──────────────────────────────────────────────
        if (user.tier === 'free') {
            return res.status(403).json({
                message: 'Appointment booking requires a Lite or Pro subscription.',
                upgradeRequired: true,
            });
        }

        // Doctors are stored in Supabase, not MongoDB — accept name from frontend
        const resolvedDoctorName = doctorName || 'Doctor';
        const parsedDate = new Date(appointmentDate);

        // ── Pro users w/ Credits: appointment included in subscription ───────────────
        if (user.tier === 'pro' && user.appointmentCredits > 0) {
            // Decrement credit immediately
            user.appointmentCredits -= 1;
            await user.save();

            const appointment = await Appointment.create({
                userId: user._id,
                doctorId,
                doctorName: resolvedDoctorName,
                appointmentDate: parsedDate,
                status: 'confirmed',
                requiresPayment: false,
                amount: 0,
            });

            return res.status(201).json({
                success: true,
                requiresPayment: false,
                appointment: {
                    id: appointment._id,
                    doctorName: appointment.doctorName,
                    appointmentDate: appointment.appointmentDate,
                    status: appointment.status,
                },
                message: 'Appointment confirmed — 1 Consultation Credit used.',
                appointmentCredits: user.appointmentCredits
            });
        }

        // ── Lite users or Pro users out of credits: create Razorpay order ───────────────────────
        // Pro users get a discounted rate of ₹99, while others pay the standard ₹299
        const baseFee = user.tier === 'pro' ? 99 : 299;
        const APPOINTMENT_FEE_PAISE = baseFee * 100;

        const razorpayOrder = await razorpay.orders.create({
            amount: APPOINTMENT_FEE_PAISE,
            currency: 'INR',
            receipt: `appt_${Date.now()}`,
            notes: {
                userId: user._id.toString(),
                doctorId,
                appointmentDate: parsedDate.toISOString(),
                type: 'appointment',
            },
        });

        // Save pending appointment record
        const appointment = await Appointment.create({
            userId: user._id,
            doctorId,
            doctorName: resolvedDoctorName,
            appointmentDate: parsedDate,
            status: 'pending',
            requiresPayment: true,
            amount: baseFee,
            currency: 'INR',
            paymentOrderId: razorpayOrder.id,
        });

        return res.status(201).json({
            success: true,
            requiresPayment: true,
            orderId: razorpayOrder.id,
            amount: APPOINTMENT_FEE_PAISE,
            currency: 'INR',
            appointmentId: appointment._id,
            doctorName: resolvedDoctorName,
            appointmentDate: parsedDate,
        });

    } catch (error) {
        console.error('Error creating appointment order:', error);
        res.status(500).json({ success: false, message: 'Failed to create appointment order', error: error.message });
    }
};

/**
 * @desc    Verify Razorpay payment signature and confirm the appointment.
 * @route   POST /api/payment/verify-appointment-payment
 * @access  Private
 */
export const verifyAppointmentPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, appointmentId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !appointmentId) {
            return res.status(400).json({ message: 'All payment fields are required' });
        }

        // ── HMAC-SHA256 signature verification ───────────────────────────
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed. Invalid signature.',
            });
        }

        // ── Update appointment record ─────────────────────────────────────
        const appointment = await Appointment.findOneAndUpdate(
            { _id: appointmentId, userId: req.user._id, paymentOrderId: razorpayOrderId },
            {
                status: 'confirmed',
                paymentId: razorpayPaymentId,
                razorpaySignature,
            },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found or does not belong to this user' });
        }

        return res.json({
            success: true,
            message: 'Payment verified. Appointment confirmed.',
            appointment: {
                id: appointment._id,
                doctorName: appointment.doctorName,
                appointmentDate: appointment.appointmentDate,
                status: appointment.status,
            },
        });

    } catch (error) {
        console.error('Error verifying appointment payment:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
    }
};

/**
 * @desc    Get all appointments for the logged-in user.
 * @route   GET /api/payment/appointments
 * @access  Private
 */
export const getUserAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.user._id }).sort({ appointmentDate: 1 });
        return res.json({ success: true, appointments });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
};