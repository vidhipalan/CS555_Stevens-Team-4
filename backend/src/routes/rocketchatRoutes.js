const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getRocketChatLogin,
  createDirectMessage,
  getContacts,
} = require('../controllers/rocketchatController');

// All routes require authentication
router.use(authMiddleware);

// Get Rocket.Chat login credentials
router.get('/login', getRocketChatLogin);

// Create direct message channel
router.post('/create-dm', createDirectMessage);

// Get contacts (clinicians for patients, patients for clinicians)
router.get('/contacts', getContacts);

module.exports = router;

