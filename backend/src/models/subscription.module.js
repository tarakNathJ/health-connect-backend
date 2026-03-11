import mongoose from "mongoose";


const subscriptionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        plan: {
            type: String,
            enum: ['free', 'lite', 'pro'],
            default: 'free'
        },
        billingCycle: {
            type: String,
            enum: ['trial', 'weekly', 'monthly', 'sixMonths', 'yearly'],
            required: true
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'cancelled', 'expired'],
            default: 'active'
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
        },
        razorpayOrderId: {
            type: String,
        },
        razorpayPaymentId: {
            type: String,
        },
        amount: {
            type: Number,
            default: 0
        },

    },
    {
        timestamps: true
    }
);
const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;