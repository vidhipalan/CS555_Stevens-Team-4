const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
  },
  mood: {
    type: String,
    required: true,
    enum: ['happy', 'neutral', 'sad', 'angry', 'anxious', 'excited', 'tired'],
  },
  note: {
    type: String,
    default: '',
    maxlength: 2000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

moodSchema.index({ userId: 1, date: 1 }, { unique: true });

moodSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Mood', moodSchema);


