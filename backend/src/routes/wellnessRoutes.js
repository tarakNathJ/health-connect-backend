import express from 'express';
import { saveWellnessEntry, getWellnessEntries, deleteWellnessEntry } from '../controllers/wellnessController.js';

const router = express.Router();

// @route   POST /api/wellness/save
// @desc    Save a new wellness journal entry
router.post('/save', saveWellnessEntry);

// @route   GET /api/wellness/:userId
// @desc    Get all wellness entries for a user
router.get('/:userId', getWellnessEntries);

// @route   DELETE /api/wellness/:id
// @desc    Delete a specific wellness entry
router.delete('/:id', deleteWellnessEntry);

export default router;
