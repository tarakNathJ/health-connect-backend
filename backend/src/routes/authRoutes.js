import express from 'express';
import { check } from 'express-validator';
import {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    updateUserTier,
    deleteUserAccount,
    registerDoctor,
    loginDoctor,
    messageForDoctor,
    getAllmessage,
    getAllDoctor,
    getDoctorProfile,
    updateDoctorProfile,
    cancelSubscription,
    googleLogin
} from '../controllers/authController.js';

import { BarcodeSearchResult } from '../controllers/foodDetails.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
    ],
    registerUser
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').exists()
    ],
    loginUser
);

// @route   POST /api/auth/google
// @desc    Authenticate user via Google OAuth
// @access  Public
router.post('/google', googleLogin);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, getUserProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateUserProfile);

// @route   PUT /api/auth/tier
// @desc    Update user subscription tier
// @access  Private
router.put('/tier', protect, updateUserTier);

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account', protect, deleteUserAccount);
router.delete('/cancelSubscription', protect, cancelSubscription);

// @route   PUT /api/auth/tier-debug
// @desc    Debug endpoint for tier updates
// @access  Private
router.put('/tier-debug', protect, (req, res) => {
    try {
        console.log('DEBUG - Tier update request received:');
        console.log('User:', req.user);
        console.log('Request body:', req.body);

        // Validate tier value
        const { tier } = req.body;
        if (!['free', 'lite', 'pro'].includes(tier)) {
            console.log('DEBUG - Invalid tier value:', tier);
            return res.status(400).json({ message: 'Invalid tier value. Must be free, lite, or pro.' });
        }

        // Log the current tier before updating
        import('../models/User.js').then(({ default: User }) => {
            User.findById(req.user._id)
                .then(user => {
                    if (user) {
                        console.log('DEBUG - Current tier:', user.tier);
                        console.log('DEBUG - Updating to tier:', tier);

                        // Update user tier
                        user.tier = tier;
                        user.save()
                            .then(updatedUser => {
                                console.log('DEBUG - Tier updated successfully to:', updatedUser.tier);
                                res.json({
                                    _id: updatedUser._id,
                                    name: updatedUser.name,
                                    email: updatedUser.email,
                                    isAdmin: updatedUser.isAdmin,
                                    tier: updatedUser.tier,
                                    message: 'Tier updated successfully via debug endpoint'
                                });
                            })
                            .catch(saveError => {
                                console.error('DEBUG - Error saving user:', saveError);
                                res.status(500).json({ message: 'Error saving user' });
                            });
                    } else {
                        console.log('DEBUG - User not found');
                        res.status(404).json({ message: 'User not found' });
                    }
                })
                .catch(findError => {
                    console.error('DEBUG - Error finding user:', findError);
                    res.status(500).json({ message: 'Error finding user' });
                });
        }).catch(importError => {
            console.error('DEBUG - Error importing User model:', importError);
            res.status(500).json({ message: 'Server error' });
        });
    } catch (error) {
        console.error('DEBUG - Unexpected error in tier-debug endpoint:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/registerDoctor', registerDoctor);
router.post('/loginDoctor', loginDoctor);
router.post('/messageForDoctor', protect, messageForDoctor);
router.post('/getAllmessage', getAllmessage);
router.get('/getAlldoctor', getAllDoctor);
router.post('/getDoctorProfile', getDoctorProfile);
router.put('/updateDoctorProfile', updateDoctorProfile);
router.post('/BarcodeSearchResult', BarcodeSearchResult);

export default router; 
