const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getRocketChatLogin,
  createDirectMessage,
  getContacts,
  getMessages,
  sendMessage,
  getUnreadCount,
} = require('../controllers/rocketchatController');

// All routes require authentication
router.use(authMiddleware);

// Get Rocket.Chat login credentials
router.get('/login', getRocketChatLogin);

// Create direct message channel
router.post('/create-dm', createDirectMessage);

// Get contacts (clinicians for patients, patients for clinicians)
router.get('/contacts', getContacts);

// Get messages from a room
router.get('/messages/:roomId', getMessages);

// Send a message to a room
router.post('/send-message', sendMessage);

// Get unread message count
router.get('/unread-count', getUnreadCount);

module.exports = router;

