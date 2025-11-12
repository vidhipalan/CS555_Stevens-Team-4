const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireClinician } = require('../middleware/roleAuth');
const moodController = require('../controllers/moodController');

// REFACTORED: Using requireClinician middleware for role-based authorization
router.get('/all-patients', auth, requireClinician, moodController.getAllPatientsMoods);
router.get('/today', auth, moodController.getByDate);
router.post('/', auth, moodController.createOrUpdateByDate);
router.get('/', auth, moodController.getHistory);

module.exports = router;


