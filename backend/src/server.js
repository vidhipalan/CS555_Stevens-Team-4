// backend/src/server.js  (CommonJS version)
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// --- middleware ---
app.use(cors({
  origin: true, // ok for dev; tighten later
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- connect Mongo ---
const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI missing in .env');
  process.exit(1);
}
mongoose.set('strictQuery', true);
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ Mongo connection error:', err.message);
    process.exit(1);
  });

// --- health route ---
app.get('/health', (req, res) => res.json({ ok: true }));

// --- API routes ---
app.use('/api/auth', require('./routes/authRoutes'));

// --- error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
module.exports = app;

// --- start server ---
const PORT = process.env.PORT || 5050; // use 5050 since 5000 is busy on your Mac
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

