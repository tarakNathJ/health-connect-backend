import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        token: {
            type: String,
            required: true
        },
        expires: {
            type: Date,
            required: true,
            default: function () {
                // Token expires in 1 hour
                return new Date(Date.now() +  7200000);
            }
        },
        used: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset; 