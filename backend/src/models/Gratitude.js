const mongoose = require('mongoose');

const gratitudeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
    default: ''
  },
  isDraft: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  mood: {
    type: String,
    enum: ['very-happy', 'happy', 'neutral', 'sad', 'very-sad'],
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient querying by user and date
gratitudeSchema.index({ user: 1, date: -1 });
gratitudeSchema.index({ user: 1, isDraft: 1 });

// Virtual for formatted date
gratitudeSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Ensure virtual fields are serialized
gratitudeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Gratitude', gratitudeSchema);
