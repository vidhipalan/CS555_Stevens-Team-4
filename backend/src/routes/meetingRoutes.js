const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createMeetingRequest,
  getMeetingRequests,
  getMyMeetingRequests,
  acceptMeetingRequest,
  rejectMeetingRequest,
  getMeetings,
  getMeeting,
  getClinicians,
  cancelMeetingRequest,
  cancelMeeting,
} = require('../controllers/meetingController');

// All routes require authentication
router.use(authMiddleware);

// Get list of clinicians (for patients)
router.get('/clinicians', getClinicians);

// Meeting requests
router.post('/request', createMeetingRequest);
router.get('/requests', getMeetingRequests); // For clinicians
router.get('/my-requests', getMyMeetingRequests); // For patients
router.post('/accept/:requestId', acceptMeetingRequest);
router.post('/reject/:requestId', rejectMeetingRequest);
router.post('/cancel-request/:requestId', cancelMeetingRequest); // For patients to cancel their requests

// Meetings
router.get('/', getMeetings);
router.get('/:meetingId', getMeeting);
router.post('/cancel/:meetingId', cancelMeeting); // Cancel a scheduled meeting

module.exports = router;

