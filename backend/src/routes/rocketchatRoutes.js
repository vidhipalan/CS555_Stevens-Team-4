const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getChatToken,
  getChannels,
} = require('../controllers/rocketchatController');

// All routes require authentication
router.get('/login', auth, getChatToken);
router.get('/channels', auth, getChannels);

module.exports = router;

