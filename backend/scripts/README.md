# Database Management Scripts

This directory contains scripts to manage the database for the CS555 application.

## Available Scripts

### 1. Clear All Database Data
**File:** `clearDatabase.js`
**Usage:** `npm run clear-db`

This script clears ALL data from the database:
- All users (patients and clinicians)
- All mood entries
- All gratitude entries
- All example data

### 2. Advanced Database Clearing
**File:** `clearDatabaseAdvanced.js`
**Usage:** `node scripts/clearDatabaseAdvanced.js [options]`

This script provides more granular control over what to clear:

#### Options:
- `--all` - Clear all collections (default)
- `--users` - Clear only users (automatically includes moods and gratitudes)
- `--moods` - Clear only mood entries
- `--gratitudes` - Clear only gratitude entries
- `--examples` - Clear only example entries
- `--help` or `-h` - Show help message

#### Examples:
```bash
# Clear everything (default)
node scripts/clearDatabaseAdvanced.js

# Clear everything explicitly
node scripts/clearDatabaseAdvanced.js --all

# Clear only users and their related data
node scripts/clearDatabaseAdvanced.js --users

# Clear only mood and gratitude entries
node scripts/clearDatabaseAdvanced.js --moods --gratitudes

# Show help
node scripts/clearDatabaseAdvanced.js --help
```

## Prerequisites

1. Make sure you have a `.env` file in the backend directory with your `MONGODB_URI`
2. Ensure the backend dependencies are installed: `npm install`

## Safety Notes

⚠️ **WARNING:** These scripts will permanently delete data from your database. Make sure you have backups if needed.

- The scripts will clear data in the correct order to avoid foreign key constraint issues
- User-related data (moods, gratitudes) are cleared before users themselves
- The scripts provide detailed output showing what was deleted

## Database Collections

The application uses these MongoDB collections:
- `users` - User accounts (patients and clinicians)
- `moods` - Mood tracking entries
- `gratitudes` - Gratitude journal entries
- `examples` - Example/test data
