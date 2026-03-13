import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    doctorId: {
        type: String,  // Supabase UUID — doctors are NOT in MongoDB
        required: true,
    },
    doctorName: {
        type: String,
        required: true,
    },
    appointmentDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending',
    },
    // Payment fields (only set for Lite users — Pro included in subscription)
    requiresPayment: {
        type: Boolean,
        default: false,
    },
    amount: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: 'INR',
    },
    paymentOrderId: {
        type: String,
        default: null,
    },
    paymentId: {
        type: String,
        default: null,
    },
    razorpaySignature: {
        type: String,
        default: null,
    },
    // Optional message sent to doctor
    message: {
        type: String,
        default: '',
    },
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
