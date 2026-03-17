import express from 'express';
import { saveUserHealthProfile, getUserHealthProfile } from '../controllers/healthProfileController.js';

const router = express.Router();

// @route   POST /api/health-profile/save
// @desc    Save/upsert user health profile for cross-device sync
// @access  Public (identified by userId/email in body)
router.post('/save', saveUserHealthProfile);

// @route   GET /api/health-profile/:userId
// @desc    Get user health profile for cross-device sync
// @access  Public (identified by userId/email in params)
router.get('/:userId', getUserHealthProfile);

export default router;
