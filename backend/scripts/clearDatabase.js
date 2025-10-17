const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const Mood = require('../src/models/Mood');
const Gratitude = require('../src/models/Gratitude');
const Example = require('../src/models/exampleModel');

const clearDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections
    console.log('\n🗑️  Clearing database collections...');
    
    // Clear user-related data first (due to foreign key constraints)
    const moodResult = await Mood.deleteMany({});
    console.log(`✅ Deleted ${moodResult.deletedCount} mood entries`);
    
    const gratitudeResult = await Gratitude.deleteMany({});
    console.log(`✅ Deleted ${gratitudeResult.deletedCount} gratitude entries`);
    
    const userResult = await User.deleteMany({});
    console.log(`✅ Deleted ${userResult.deletedCount} users`);
    
    // Clear example data if any
    const exampleResult = await Example.deleteMany({});
    console.log(`✅ Deleted ${exampleResult.deletedCount} example entries`);

    console.log('\n🎉 Database cleared successfully!');
    console.log('\nSummary:');
    console.log(`- Users: ${userResult.deletedCount}`);
    console.log(`- Mood entries: ${moodResult.deletedCount}`);
    console.log(`- Gratitude entries: ${gratitudeResult.deletedCount}`);
    console.log(`- Example entries: ${exampleResult.deletedCount}`);

  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
clearDatabase();
