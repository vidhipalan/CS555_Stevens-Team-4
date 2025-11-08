const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getChatToken,
  getChatUsers,
} = require('../controllers/rocketchatController');

// All routes require authentication
router.get('/login', auth, getChatToken);
router.get('/users', auth, getChatUsers);

module.exports = router;
