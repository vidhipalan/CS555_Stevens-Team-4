const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/moods', require('./routes/moodRoutes'));

module.exports = app;

