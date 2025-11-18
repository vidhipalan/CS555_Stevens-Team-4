const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes setup
app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/moods', require('./routes/moodRoutes'));
app.use('/api/gratitude', require('./routes/gratitudeRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/rocketchat', require('./routes/rocketchatRoutes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// MongoDB connection function
const connectDB = async () => {
  const { MONGODB_URI } = process.env;
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI missing in .env file');
    console.error('Please create a .env file with: MONGODB_URI=your_connection_string');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    
    // Connection options for better error handling
    const mongooseOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
      retryWrites: true,
      w: 'majority'
    };

    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('   This usually means:');
      console.error('   1. MongoDB server is not running');
      console.error('   2. Incorrect connection string');
      console.error('   3. Network/firewall issues');
      console.error('   4. MongoDB Atlas IP whitelist restrictions');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused - MongoDB server may not be running');
    }
    
    process.exit(1);
  }
};

// Start server only after MongoDB connection
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 5050;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
if (require.main === module) {
  startServer();
}

module.exports = app;

