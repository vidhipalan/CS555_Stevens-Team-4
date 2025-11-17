const mongoose = require('mongoose');
const crypto = require('crypto');

const meetingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clinicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  meetingId: {
    type: String,
    required: true,
    unique: true,
  },
  meetingLink: {
    type: String,
    required: true,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  duration: {
    type: Number,
    default: 30, // minutes
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

meetingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate a unique meeting ID and link
meetingSchema.statics.generateMeeting = function() {
  const meetingId = crypto.randomBytes(16).toString('hex');
  // Using Jitsi Meet format - you can change this to Zoom, Google Meet, etc.
  const meetingLink = `https://meet.jit.si/${meetingId}`;
  return { meetingId, meetingLink };
};

module.exports = mongoose.model('Meeting', meetingSchema);

