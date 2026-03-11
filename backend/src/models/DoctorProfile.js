import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const doctorSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters']
        },
        specialty: {
            type: String,
        },
        subspecialties: [String],
        hospital: {
            type: String,
        },
        location: {
            type: String,
        },
        experience: {
            type: Number
        },
        rating: {
            type: Number,
        },
        reviewCount: {
            type: Number
        },
        patients: {
            type: Number
        },
        bio: {
            type: String
        },
        education: [String],
        certifications: [String],
        specializations: [String],
        availability: {
            days: [String],
            hours: String
        },
        contactInfo: {
            email: String,
            phone: String
        },
        emailVerified: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Hash password before saving
doctorSchema.pre('save', async function (next) {
    // Only hash the password if it's modified (or new)
    if (!this.isModified('password')) return next();

    try {
        // Generate salt
        const salt = await bcrypt.genSalt(10);
        // Hash password
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
doctorSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor; 