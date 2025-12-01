const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { requireClinician } = require('../middleware/roleAuth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.get('/me', authMiddleware, authController.getCurrentUser);
// REFACTORED: Using requireClinician middleware for role-based authorization
router.get('/patients', authMiddleware, requireClinician, authController.getAllPatients);
router.get('/all-patients', authMiddleware, requireClinician, authController.getAllPatientsForAssignment);
router.post('/assign-patient', authMiddleware, requireClinician, authController.assignPatient);
router.post('/unassign-patient', authMiddleware, requireClinician, authController.unassignPatient);

module.exports = router;
