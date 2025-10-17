const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.get('/me', authMiddleware, authController.getCurrentUser);
router.get('/patients', authMiddleware, authController.getAllPatients);

module.exports = router;
