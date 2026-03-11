import mongoose from 'mongoose';


const paymentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            default: 'USD'
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending'
        },
        paymentId: {
            type:String,
            
        },
        OrderId: {
            type:String,
            required: true
        },
        signature: {
            type: String,
            
        },
    },
    {
        timestamps: true
    }
);
const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;