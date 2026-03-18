import jwt from 'jsonwebtoken';
import config from '../config/config.js';

/**
 * Generate JWT token for authentication and set it as an HttpOnly cookie
 * @param {object} res - Express response object
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (res, id) => {
    const token = jwt.sign({ id }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
    });

    // Determine secure flag based on environment
    const isProduction = config.nodeEnv === 'production';

    // Parse expiresIn (e.g., '30d') to milliseconds
    // Simplified: hardcode to 30 days for browser cookie
    const cookieExpiration = 30 * 24 * 60 * 60 * 1000;

    res.cookie('token', token, {
        httpOnly: true,
        secure: true,      // Always true — Vercel always serves over HTTPS
        sameSite: 'none',  // Required for cross-site cookie (medibridge.qzz.io → backend.vercel.app)
        maxAge: cookieExpiration,
    });

    return token;
};

export default generateToken; 