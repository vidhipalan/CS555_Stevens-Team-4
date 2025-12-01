const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      role: role || 'patient', // Default to patient if not provided
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages[0] || 'Validation failed' });
    }
    res.status(500).json({ error: 'Error creating user' });
  }
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
};

// @route   GET /api/auth/patients
// @desc    Get assigned patients for current clinician (clinicians only)
// @access  Private
// REFACTORED: Removed duplicate clinician authorization check
// Authorization is now handled by requireClinician middleware in routes
exports.getAllPatients = async (req, res) => {
  try {
    // Get only patients assigned to the current clinician
    const patients = await User.find({ 
      role: 'patient',
      assignedClinicianId: req.user.id 
    }).select('-password');
    
    res.json(patients);
  } catch (error) {
    console.error('Get all patients error:', error);
    res.status(500).json({ error: 'Error fetching patients' });
  }
};

// @route   GET /api/auth/all-patients
// @desc    Get all patients (for assignment purposes, clinicians only)
// @access  Private
exports.getAllPatientsForAssignment = async (req, res) => {
  try {
    // Get all patients (including unassigned ones) for assignment UI
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .populate('assignedClinicianId', 'email');
    
    res.json(patients);
  } catch (error) {
    console.error('Get all patients for assignment error:', error);
    res.status(500).json({ error: 'Error fetching patients' });
  }
};

// @route   POST /api/auth/assign-patient
// @desc    Assign a patient to the current clinician
// @access  Private (clinicians only)
exports.assignPatient = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Verify the patient exists and is actually a patient
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (patient.role !== 'patient') {
      return res.status(400).json({ error: 'User is not a patient' });
    }

    // Assign patient to current clinician
    patient.assignedClinicianId = req.user.id;
    await patient.save();

    res.json({ 
      message: 'Patient assigned successfully',
      patient: {
        id: patient._id,
        email: patient.email,
        assignedClinicianId: patient.assignedClinicianId
      }
    });
  } catch (error) {
    console.error('Assign patient error:', error);
    res.status(500).json({ error: 'Error assigning patient' });
  }
};

// @route   POST /api/auth/unassign-patient
// @desc    Unassign a patient from the current clinician
// @access  Private (clinicians only)
exports.unassignPatient = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Verify the patient exists and is assigned to this clinician
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (patient.assignedClinicianId?.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Patient is not assigned to you' });
    }

    // Unassign patient
    patient.assignedClinicianId = null;
    await patient.save();

    res.json({ 
      message: 'Patient unassigned successfully',
      patient: {
        id: patient._id,
        email: patient.email,
        assignedClinicianId: null
      }
    });
  } catch (error) {
    console.error('Unassign patient error:', error);
    res.status(500).json({ error: 'Error unassigning patient' });
  }
};
