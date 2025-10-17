const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const Mood = require('../src/models/Mood');
const Gratitude = require('../src/models/Gratitude');
const Example = require('../src/models/exampleModel');

const clearDatabase = async (options = {}) => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const results = {};

    // Clear based on options
    if (options.all || options.users) {
      console.log('\n🗑️  Clearing user-related data...');
      
      // Clear user-related data first (due to foreign key constraints)
      if (options.all || options.moods) {
        const moodResult = await Mood.deleteMany({});
        results.moods = moodResult.deletedCount;
        console.log(`✅ Deleted ${moodResult.deletedCount} mood entries`);
      }
      
      if (options.all || options.gratitudes) {
        const gratitudeResult = await Gratitude.deleteMany({});
        results.gratitudes = gratitudeResult.deletedCount;
        console.log(`✅ Deleted ${gratitudeResult.deletedCount} gratitude entries`);
      }
      
      const userResult = await User.deleteMany({});
      results.users = userResult.deletedCount;
      console.log(`✅ Deleted ${userResult.deletedCount} users`);
    }

    if (options.all || options.examples) {
      const exampleResult = await Example.deleteMany({});
      results.examples = exampleResult.deletedCount;
      console.log(`✅ Deleted ${exampleResult.deletedCount} example entries`);
    }

    console.log('\n🎉 Database clearing completed!');
    console.log('\nSummary:');
    Object.entries(results).forEach(([collection, count]) => {
      console.log(`- ${collection}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

if (args.includes('--all')) {
  options.all = true;
} else {
  if (args.includes('--users')) options.users = true;
  if (args.includes('--moods')) options.moods = true;
  if (args.includes('--gratitudes')) options.gratitudes = true;
  if (args.includes('--examples')) options.examples = true;
  
  // If no specific options, clear everything
  if (!Object.keys(options).length) {
    options.all = true;
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🗑️  Database Clearing Script

Usage: node scripts/clearDatabaseAdvanced.js [options]

Options:
  --all          Clear all collections (default)
  --users        Clear only users (includes moods and gratitudes)
  --moods        Clear only mood entries
  --gratitudes   Clear only gratitude entries
  --examples     Clear only example entries
  --help, -h     Show this help message

Examples:
  node scripts/clearDatabaseAdvanced.js --all
  node scripts/clearDatabaseAdvanced.js --users
  node scripts/clearDatabaseAdvanced.js --moods --gratitudes
`);
  process.exit(0);
}

// Run the script
clearDatabase(options);
