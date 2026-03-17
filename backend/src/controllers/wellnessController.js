import WellnessEntry from '../models/WellnessEntry.js';

/**
 * Save a new wellness journal entry.
 */
export const saveWellnessEntry = async (req, res) => {
  try {
    const { userId, entry, analysis, moodScore, emotions, stressLevel, date } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID (email) is required' });
    }
    if (!entry) {
      return res.status(400).json({ success: false, message: 'Journal entry text is required' });
    }

    const newEntry = new WellnessEntry({
      userId,
      entry,
      analysis: analysis || '',
      moodScore: moodScore || 5,
      emotions: emotions || [],
      stressLevel: stressLevel || 5,
      date: date || new Date()
    });

    await newEntry.save();

    res.status(201).json({
      success: true,
      data: newEntry,
      message: 'Wellness entry saved successfully'
    });
  } catch (error) {
    console.error('Error saving wellness entry:', error);
    res.status(500).json({ success: false, message: 'Failed to save wellness entry' });
  }
};

/**
 * Get all wellness entries for a user, sorted newest first.
 */
export const getWellnessEntries = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID (email) is required' });
    }

    const entries = await WellnessEntry.find({ userId }).sort({ date: -1 }).limit(100);

    res.status(200).json({
      success: true,
      data: entries
    });
  } catch (error) {
    console.error('Error fetching wellness entries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wellness entries' });
  }
};

/**
 * Delete a specific wellness entry by its MongoDB _id.
 */
export const deleteWellnessEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await WellnessEntry.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Wellness entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting wellness entry:', error);
    res.status(500).json({ success: false, message: 'Failed to delete wellness entry' });
  }
};
