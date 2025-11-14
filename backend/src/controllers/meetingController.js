const MeetingRequest = require('../models/MeetingRequest');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

// @desc    Create a meeting request (Patient only)
// @route   POST /api/meetings/request
// @access  Private (Patient only)
exports.createMeetingRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can request meetings' });
    }

    const { clinicianId, preferredTime, message } = req.body;

    if (!clinicianId) {
      return res.status(400).json({ error: 'Clinician ID is required' });
    }

    // Verify clinician exists
    const clinician = await User.findById(clinicianId);
    if (!clinician || clinician.role !== 'clinician') {
      return res.status(404).json({ error: 'Clinician not found' });
    }

    // Check if there's already a pending request
    const existingRequest = await MeetingRequest.findOne({
      patientId: req.user.id,
      clinicianId,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request with this clinician' });
    }

    const meetingRequest = await MeetingRequest.create({
      patientId: req.user.id,
      clinicianId,
      preferredTime,
      message,
      status: 'pending',
    });

    // Populate user details
    await meetingRequest.populate('patientId', 'email');
    await meetingRequest.populate('clinicianId', 'email');

    res.status(201).json(meetingRequest);
  } catch (error) {
    console.error('Error creating meeting request:', error);
    res.status(500).json({ error: 'Failed to create meeting request' });
  }
};

// @desc    Get meeting requests for clinician
// @route   GET /api/meetings/requests
// @access  Private (Clinician only)
exports.getMeetingRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'clinician') {
      return res.status(403).json({ error: 'Only clinicians can view meeting requests' });
    }

    const { status } = req.query;
    const query = { clinicianId: req.user.id };
    if (status) {
      query.status = status;
    }

    const requests = await MeetingRequest.find(query)
      .populate('patientId', 'email')
      .populate('clinicianId', 'email')
      .sort({ requestedDate: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching meeting requests:', error);
    res.status(500).json({ error: 'Failed to fetch meeting requests' });
  }
};

// @desc    Get meeting requests for patient
// @route   GET /api/meetings/my-requests
// @access  Private (Patient only)
exports.getMyMeetingRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can view their requests' });
    }

    const requests = await MeetingRequest.find({ patientId: req.user.id })
      .populate('patientId', 'email')
      .populate('clinicianId', 'email')
      .sort({ requestedDate: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching my meeting requests:', error);
    res.status(500).json({ error: 'Failed to fetch meeting requests' });
  }
};

// @desc    Accept a meeting request (Clinician only)
// @route   POST /api/meetings/accept/:requestId
// @access  Private (Clinician only)
exports.acceptMeetingRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'clinician') {
      return res.status(403).json({ error: 'Only clinicians can accept meeting requests' });
    }

    const { requestId } = req.params;
    const { scheduledTime } = req.body;

    if (!scheduledTime) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }

    const meetingRequest = await MeetingRequest.findById(requestId)
      .populate('patientId', 'email')
      .populate('clinicianId', 'email');

    if (!meetingRequest) {
      return res.status(404).json({ error: 'Meeting request not found' });
    }

    if (meetingRequest.clinicianId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only accept your own meeting requests' });
    }

    if (meetingRequest.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been processed' });
    }

    // Generate meeting
    const meetingId = require('crypto').randomBytes(16).toString('hex');
    const meetingLink = `https://meet.jit.si/${meetingId}`;

    // Create meeting
    const meeting = await Meeting.create({
      patientId: meetingRequest.patientId._id,
      clinicianId: meetingRequest.clinicianId._id,
      meetingId,
      meetingLink,
      scheduledTime: new Date(scheduledTime),
      status: 'scheduled',
    });

    // Update meeting request
    meetingRequest.status = 'accepted';
    meetingRequest.meetingId = meeting._id;
    await meetingRequest.save();

    // Populate meeting details
    await meeting.populate('patientId', 'email');
    await meeting.populate('clinicianId', 'email');

    res.json({
      meeting,
      meetingRequest,
    });
  } catch (error) {
    console.error('Error accepting meeting request:', error);
    res.status(500).json({ error: 'Failed to accept meeting request' });
  }
};

// @desc    Reject a meeting request (Clinician only)
// @route   POST /api/meetings/reject/:requestId
// @access  Private (Clinician only)
exports.rejectMeetingRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'clinician') {
      return res.status(403).json({ error: 'Only clinicians can reject meeting requests' });
    }

    const { requestId } = req.params;
    const { reason } = req.body;

    const meetingRequest = await MeetingRequest.findById(requestId);

    if (!meetingRequest) {
      return res.status(404).json({ error: 'Meeting request not found' });
    }

    if (meetingRequest.clinicianId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only reject your own meeting requests' });
    }

    if (meetingRequest.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been processed' });
    }

    meetingRequest.status = 'rejected';
    if (reason && reason.trim()) {
      meetingRequest.rejectionReason = reason.trim();
    }
    await meetingRequest.save();

    // Populate user details
    await meetingRequest.populate('patientId', 'email');
    await meetingRequest.populate('clinicianId', 'email');

    res.json(meetingRequest);
  } catch (error) {
    console.error('Error rejecting meeting request:', error);
    res.status(500).json({ error: 'Failed to reject meeting request' });
  }
};

// @desc    Get all meetings for a user
// @route   GET /api/meetings
// @access  Private
exports.getMeetings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const query = user.role === 'clinician' 
      ? { clinicianId: req.user.id }
      : { patientId: req.user.id };

    const { status } = req.query;
    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .populate('patientId', 'email')
      .populate('clinicianId', 'email')
      .sort({ scheduledTime: -1 });

    res.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
};

// @desc    Get a single meeting by ID
// @route   GET /api/meetings/:meetingId
// @access  Private
exports.getMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const user = await User.findById(req.user.id);

    const meeting = await Meeting.findById(meetingId)
      .populate('patientId', 'email')
      .populate('clinicianId', 'email');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user has access to this meeting
    if (meeting.patientId._id.toString() !== req.user.id && 
        meeting.clinicianId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
};

// @desc    Get list of clinicians (for patients to select)
// @route   GET /api/meetings/clinicians
// @access  Private (Patient only)
exports.getClinicians = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can view clinicians' });
    }

    const clinicians = await User.find({ role: 'clinician' })
      .select('email createdAt')
      .sort({ createdAt: -1 });

    res.json(clinicians);
  } catch (error) {
    console.error('Error fetching clinicians:', error);
    res.status(500).json({ error: 'Failed to fetch clinicians' });
  }
};

// @desc    Cancel a meeting request (Patient only)
// @route   POST /api/meetings/cancel-request/:requestId
// @access  Private (Patient only)
exports.cancelMeetingRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can cancel their meeting requests' });
    }

    const { requestId } = req.params;

    const meetingRequest = await MeetingRequest.findById(requestId);

    if (!meetingRequest) {
      return res.status(404).json({ error: 'Meeting request not found' });
    }

    if (meetingRequest.patientId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own meeting requests' });
    }

    if (meetingRequest.status === 'cancelled') {
      return res.status(400).json({ error: 'This request is already cancelled' });
    }

    if (meetingRequest.status === 'accepted') {
      return res.status(400).json({ error: 'Cannot cancel an accepted request. Please cancel the meeting instead.' });
    }

    meetingRequest.status = 'cancelled';
    await meetingRequest.save();

    // Populate user details
    await meetingRequest.populate('patientId', 'email');
    await meetingRequest.populate('clinicianId', 'email');

    res.json(meetingRequest);
  } catch (error) {
    console.error('Error cancelling meeting request:', error);
    res.status(500).json({ error: 'Failed to cancel meeting request' });
  }
};

// @desc    Cancel a meeting (Patient or Clinician)
// @route   POST /api/meetings/cancel/:meetingId
// @access  Private
exports.cancelMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const user = await User.findById(req.user.id);

    const meeting = await Meeting.findById(meetingId)
      .populate('patientId', 'email')
      .populate('clinicianId', 'email');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user has access to this meeting
    if (meeting.patientId._id.toString() !== req.user.id && 
        meeting.clinicianId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (meeting.status === 'cancelled') {
      return res.status(400).json({ error: 'This meeting is already cancelled' });
    }

    if (meeting.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed meeting' });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    res.json(meeting);
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    res.status(500).json({ error: 'Failed to cancel meeting' });
  }
};

