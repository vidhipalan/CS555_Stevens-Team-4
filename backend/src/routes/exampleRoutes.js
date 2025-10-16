const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Example route is working!' });
});

router.post('/', (req, res) => {
  const data = req.body;
  res.json({ message: 'Data received', data });
});

module.exports = router;
