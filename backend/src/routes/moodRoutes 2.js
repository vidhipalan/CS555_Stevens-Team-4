const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const moodController = require('../controllers/moodController');

router.get('/today', auth, moodController.getByDate); 
router.post('/', auth, moodController.createOrUpdateByDate); 
router.get('/', auth, moodController.getHistory);

module.exports = router;


