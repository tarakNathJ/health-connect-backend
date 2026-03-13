import { validationResult } from 'express-validator';
import User from '../models/User.js';
import Doctor from '../models/DoctorProfile.js';
import Messges from '../models/messages.js';
import generateToken from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_SECRET);/**
 * @description Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const registerUser = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password,
            tier: 'free', // Default tier
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                tier: user.tier,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Error in registerUser: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @description Authenticate user & get token
 * @route POST /api/auth/login
 * @access Public
 */
export const loginUser = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        // Check if user exists and password matches
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                tier: user.tier,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error in loginUser: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @description Get user profile
 * @route GET /api/auth/profile
 * @access Private
 */
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                profileImage: user.profileImage,
                tier: user.tier,
                createdAt: user.createdAt
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error in getUserProfile: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @description Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.profileImage = req.body.profileImage || user.profileImage;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                profileImage: updatedUser.profileImage,
                tier: updatedUser.tier,
                createdAt: updatedUser.createdAt,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error in updateUserProfile: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @description Update user tier
 * @route PUT /api/auth/tier
 * @access Private
 */
export const updateUserTier = async (req, res) => {
    try {
        const { tier } = req.body;

        // SECURITY: This endpoint is ONLY for downgrading to free.
        // Upgrades to lite/pro must go through verifyPayment (Razorpay).
        if (tier !== 'free') {
            return res.status(403).json({ message: 'Forbidden: tier upgrades must go through payment verification.' });
        }

        const user = await User.findById(req.user._id);

        if (user) {
            user.tier = tier;
            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                tier: updatedUser.tier,
                token: generateToken(updatedUser._id),
            });
        } else {
            console.log('[TIER UPDATE] User not found with ID:', req.user?._id);
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('[TIER UPDATE] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @description Delete user account
 * @route DELETE /api/auth/account
 * @access Private
 */
export const deleteUserAccount = async (req, res) => {
    try {
        const { password } = req.body;

        // Check if password was provided
        if (!password) {
            return res.status(400).json({ message: 'Password is required to delete account' });
        }

        // Find the user by ID
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Password is incorrect' });
        }

        // Delete the user
        await User.findByIdAndDelete(req.user._id);

        // Send success response
        res.status(200).json({ success: true, message: 'Account successfully deleted' });
    } catch (error) {
        console.error('Error in deleteUserAccount:', error);
        res.status(500).json({ message: 'Server error during account deletion' });
    }
};


export const registerDoctor = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const {
            firstName,
            lastName,
            email,
            password,
            specialty,
            subspecialties,
            hospital,
            location,
            experience,
            rating,
            reviewCount,
            patients,
            bio,
            education,
            certifications,
            specializations,
            availability,
            contactInfo,
            emailVerified } = req.body;

        // Check if user already exists
        const doctorExists = await Doctor.findOne({ email });

        if (doctorExists) {
            return res.status(400).json({ message: 'Doctor all rady exit already exists' });

        }
        const createDoctorAccount = await Doctor.create({
            firstName,
            lastName,
            email,
            password,
            specialty,
            subspecialties,
            hospital,
            location,
            experience,
            rating,
            reviewCount,
            patients,
            bio,
            education,
            certifications,
            specializations,
            availability,
            contactInfo,
            emailVerified
        })
        if (createDoctorAccount) {
            res.status(201).json({
                _id: createDoctorAccount._id,
                firstName: createDoctorAccount.firstName,
                lastName: createDoctorAccount.lastName,
                email: createDoctorAccount.email,
                isAdmin: createDoctorAccount.isAdmin,
                tier: createDoctorAccount.tier,
                token: generateToken(createDoctorAccount._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }


    } catch (error) {

        console.error('Error in registerUser: ', error);
        res.status(500).json({ message: 'Server error' });

    }
}


export const loginDoctor = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        console.log('[LOGIN DOCTOR] Request received:', { email }, { password }); // Mask password in logs

        // Find user by email
        const doctor = await Doctor.findOne({ email: email });


        // Check if user exists and password matches
        if (doctor && (await doctor.matchPassword(password))) {
            res.status(200).json({
                doctor: doctor,
                token: generateToken(doctor._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error in loginUser: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};
export const messageForDoctor = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(400).json({ message: 'user not exit' })
        }


        const { doctorId, messges, body } = req.body;
        console.log('[MESSAGE FOR DOCTOR] Request received:', { doctorId }, { messges }, { body });
        const findDoctor = await Doctor.findById({ _id: doctorId });
        if (!findDoctor) {
            return res.status(400).json({ message: 'user not exit' })
        }
        const create_message = await Messges.create({
            userId: user._id,
            doctorId: findDoctor._id,
            patienEmail: user.email,
            patienName: user.name,
            Messges: messges,
            body: body
        });
        if (!create_message) {
            return res.status(400).json({ message: "message dose not create" })
        }

        return res.status(201).json({
            messges: "message  send success fully",
            messageId: create_message._id
        })




    } catch (error) {
        console.error('Error in loginUser: ', error);
        return res.status(500).json({ message: 'Server error' });
    }
}


export const getAllmessage = async (req, res) => {
    try {
        const { doctorEmail } = req.body;
        const findDoctor = await Doctor.findOne({ email: doctorEmail });
        if (!findDoctor) {
            return res.status(400).json({ message: 'doctor not exit' })
        }
        const getALlMessage = await Messges.find({ doctorId: findDoctor._id });
        return res.status(200).json({
            messges: "message  success fully fatch",
            allMessges: getALlMessage
        })

    } catch (error) {
        console.error('Error in loginUser: ', error);
        return res.status(500).json({ message: 'Server error' });

    }

}
export const getAllDoctor = async (req, res) => {
    try {
        const allDoctor = await Doctor.find({});

        return res.status(200).json({
            messges: "message  success fully fatch",
            allDoctor: allDoctor
        })

    } catch (error) {
        console.error('Error in loginUser: ', error);
        return res.status(500).json({ message: 'Server error' });
    }

}
export const getDoctorProfile = async (req, res) => {
    try {
        const { doctorEmail } = req.body;
        const findDoctor = await Doctor.findOne({ email: doctorEmail });
        if (!findDoctor) {
            return res.status(400).json({ message: 'doctor not exit' })
        }

        return res.status(200).json({
            messges: "message  success fully fatch",
            doctorUsre: findDoctor
        })

    } catch (error) {
        console.error('Error in loginUser: ', error);
        return res.status(500).json({ message: 'Server error' });

    }

}

export const updateDoctorProfile = async (req, res) => {
    try {
        const { doctorId, ...updateData } = req.body;

        if (!doctorId) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Update allowed fields
        const allowedFields = [
            'firstName', 'lastName', 'specialty', 'subspecialties',
            'hospital', 'location', 'experience', 'bio',
            'education', 'certifications', 'specializations',
            'availability', 'contactInfo'
        ];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                doctor[field] = updateData[field];
            }
        });

        const updatedDoctor = await doctor.save();

        return res.status(200).json({
            message: 'Profile updated successfully',
            doctor: updatedDoctor
        });

    } catch (error) {
        console.error('Error in updateDoctorProfile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export const cancelSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const { password } = req.body;

        // Check if password was provided
        if (!password) {
            return res.status(400).json({ message: 'Password is required to delete account' });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Password is incorrect' });
        }


        // Reset the user's tier to 'free'
        user.tier = 'free';
        await user.save();

        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            tier: user.tier,
        });
    } catch (error) {
        console.error('Error in cancelSubscription:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

/**
 * @description Authenticate or Register user via Google OAuth
 * @route POST /api/auth/google
 * @access Public
 */
export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Google credential token is missing.' });
        }

        // Verify the token using Google Auth Library
        const ticket = await client.verifyIdToken({
            idToken: credential,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        let user = await User.findOne({ email });

        if (user) {
            // User exists, just log them in
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                profileImage: user.profileImage || picture,
                tier: user.tier || 'free',
                token: generateToken(user._id),
                message: 'Successfully logged in with Google',
            });
        } else {
            // New user, register them automatically
            const randomPassword = crypto.randomBytes(16).toString('hex');
            user = await User.create({
                name,
                email,
                password: randomPassword, // Generate a random impossible password
                profileImage: picture,
                tier: 'free',
            });

            if (user) {
                res.status(201).json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    profileImage: user.profileImage,
                    tier: user.tier,
                    token: generateToken(user._id),
                    message: 'Successfully registered and logged in with Google',
                });
            } else {
                res.status(400).json({ message: 'Failed to create an account via Google Auth' });
            }
        }
    } catch (error) {
        console.error('Error in googleLogin:', error);
        res.status(500).json({ message: 'Server verification failed connecting to Google' });
    }
};
