import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../utils/emailService.js';
import config from '../config/config.js';

/**
 * @description Request password reset
 * @route POST /api/password/forgot
 * @access Public
 */
export const forgotPassword = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });

        // Don't reveal that the user doesn't exist
        if (!user) {
            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent'
            });
        }

        // Generate a random token
        const token = crypto.randomBytes(32).toString('hex');

        // Save the token in the database
        await PasswordReset.create({
            email: user.email,
            token,
            expires: new Date(Date.now() + 3600000), // 1 hour
        });

        // Create reset URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${baseUrl}/reset-password/${token}`;

        // Send password reset email
        await sendPasswordResetEmail(user.email, resetUrl);

        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent'
        });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @description Validate reset token
 * @route GET /api/password/reset/:token
 * @access Public
 */
export const validateResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Find the token in the database
        const passwordReset = await PasswordReset.findOne({
            token,
            expires: { $gt: Date.now() },
            used: false,
        });

        if (!passwordReset) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        res.status(200).json({
            message: 'Token is valid',
            email: passwordReset.email
        });
    } catch (error) {
        console.error('Error in validateResetToken:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @description Reset password
 * @route POST /api/password/reset/:token
 * @access Public
 */
export const resetPassword = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token } = req.params;
        const { password } = req.body;

        // Find the token in the database
        const passwordReset = await PasswordReset.findOne({
            token,
            expires: { $gt: Date.now() },
            used: false,
        });

        if (!passwordReset) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Find the user
        const user = await User.findOne({ email: passwordReset.email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update password
        user.password = password;
        await user.save();

        // Mark token as used
        passwordReset.used = true;
        await passwordReset.save();

        // Send password changed email
        await sendPasswordChangedEmail(user.email);

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 