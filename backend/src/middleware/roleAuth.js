const User = require('../models/User');

/**
 * REFACTORED: Middleware for role-based authorization
 *
 * This middleware eliminates duplicate clinician authorization checks
 * that previously appeared in:
 * - authController.js (getAllPatients)
 * - moodController.js (getAllPatientsMoods)
 * - gratitudeController.js (getAllPatientsGratitude)
 *
 * Refactoring Method: Extract Method + Middleware Pattern
 * Benefits:
 * - Single source of truth for clinician authorization
 * - Easier to maintain and update
 * - Follows DRY principle
 * - Can be reused for other roles in the future
 */
const requireClinician = async (req, res, next) => {
  try {
    // Get the requesting user
    const requestingUser = await User.findById(req.user.id);

    if (!requestingUser || requestingUser.role !== 'clinician') {
      return res.status(403).json({ error: 'Access denied. Clinicians only.' });
    }

    // User is a clinician, proceed to next middleware/controller
    next();
  } catch (error) {
    console.error('Role authorization error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { requireClinician };
