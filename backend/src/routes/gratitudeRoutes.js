const express = require('express');
const router = express.Router();
const {
  getGratitudeEntries,
  getGratitudeEntry,
  createGratitudeEntry,
  updateGratitudeEntry,
  deleteGratitudeEntry,
  getGratitudeEntriesByDate,
  getDraftEntries
} = require('../controllers/gratitudeController');
const auth = require('../middleware/auth');

// All routes are protected
router.use(auth);

// @route   GET /api/gratitude
// @desc    Get all gratitude entries for authenticated user
// @access  Private
router.get('/', getGratitudeEntries);

// @route   GET /api/gratitude/drafts
// @desc    Get all draft entries for authenticated user
// @access  Private
router.get('/drafts', getDraftEntries);

// @route   GET /api/gratitude/date/:date
// @desc    Get gratitude entries for specific date
// @access  Private
router.get('/date/:date', getGratitudeEntriesByDate);

// @route   GET /api/gratitude/:id
// @desc    Get single gratitude entry
// @access  Private
router.get('/:id', getGratitudeEntry);

// @route   POST /api/gratitude
// @desc    Create new gratitude entry
// @access  Private
router.post('/', createGratitudeEntry);

// @route   PUT /api/gratitude/:id
// @desc    Update gratitude entry
// @access  Private
router.put('/:id', updateGratitudeEntry);

// @route   DELETE /api/gratitude/:id
// @desc    Delete gratitude entry
// @access  Private
router.delete('/:id', deleteGratitudeEntry);

module.exports = router;
