import express from 'express';
import { check } from 'express-validator';
import {
    forgotPassword,
    validateResetToken,
    resetPassword
} from '../controllers/passwordController.js';

const router = express.Router();

// @route   POST /api/password/forgot
// @desc    Request password reset
// @access  Public
router.post(
    '/forgot',
    [
        check('email', 'Please include a valid email').isEmail()
    ],
    forgotPassword
);

// @route   GET /api/password/reset/:token
// @desc    Validate reset token
// @access  Public
router.get('/reset/:token', validateResetToken);

// @route   POST /api/password/reset/:token
// @desc    Reset password
// @access  Public
router.post(
    '/reset/:token',
    [
        check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
    ],
    resetPassword
);

export default router; 