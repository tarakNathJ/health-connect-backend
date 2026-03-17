import mongoose from 'mongoose';

const wellnessEntrySchema = new mongoose.Schema({
  userId: {
    type: String, // User email
    required: true,
    index: true
  },
  entry: {
    type: String,
    required: true
  },
  analysis: {
    type: String, // AI markdown analysis
    default: ''
  },
  moodScore: {
    type: Number, // 1-10
    min: 1,
    max: 10,
    default: 5
  },
  emotions: [{
    type: String
  }],
  stressLevel: {
    type: Number, // 1-10
    min: 1,
    max: 10,
    default: 5
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient queries by user + date
wellnessEntrySchema.index({ userId: 1, date: -1 });

const WellnessEntry = mongoose.model('WellnessEntry', wellnessEntrySchema);

export default WellnessEntry;
