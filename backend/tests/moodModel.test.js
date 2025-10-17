const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Mood = require('../src/models/Mood');
const User = require('../src/models/User');

let mongo;
let userId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});

beforeEach(async () => {
  // Clean up database
  await Mood.deleteMany({});
  await User.deleteMany({});
  
  // Create a test user
  const user = new User({
    email: 'test@example.com',
    password: 'hashedpassword123'
  });
  await user.save();
  userId = user._id;
});

describe('Mood Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid mood entry', async () => {
      const moodData = {
        userId,
        date: new Date('2024-01-15'),
        mood: 'happy',
        note: 'Feeling great today!'
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood._id).toBeDefined();
      expect(savedMood.userId.toString()).toBe(userId.toString());
      expect(savedMood.date).toEqual(new Date('2024-01-15'));
      expect(savedMood.mood).toBe('happy');
      expect(savedMood.note).toBe('Feeling great today!');
      expect(savedMood.createdAt).toBeDefined();
      expect(savedMood.updatedAt).toBeDefined();
    });

    it('should require userId field', async () => {
      const moodData = {
        date: new Date(),
        mood: 'happy',
        note: 'Missing userId'
      };

      const mood = new Mood(moodData);
      
      try {
        await mood.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.userId).toBeDefined();
        expect(error.errors.userId.message).toContain('required');
      }
    });

    it('should require date field', async () => {
      const moodData = {
        userId,
        mood: 'happy',
        note: 'Missing date'
      };

      const mood = new Mood(moodData);
      
      try {
        await mood.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.date).toBeDefined();
        expect(error.errors.date.message).toContain('required');
      }
    });

    it('should require mood field', async () => {
      const moodData = {
        userId,
        date: new Date(),
        note: 'Missing mood'
      };

      const mood = new Mood(moodData);
      
      try {
        await mood.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.mood).toBeDefined();
        expect(error.errors.mood.message).toContain('required');
      }
    });

    it('should validate mood enum values', async () => {
      const validMoods = ['happy', 'neutral', 'sad', 'angry', 'anxious', 'excited', 'tired'];
      
      for (const moodValue of validMoods) {
        const moodData = {
          userId,
          date: new Date(),
          mood: moodValue,
          note: `Test note for ${moodValue}`
        };

        const mood = new Mood(moodData);
        const savedMood = await mood.save();
        expect(savedMood.mood).toBe(moodValue);
        
        // Clean up for next iteration
        await Mood.findByIdAndDelete(savedMood._id);
      }
    });

    it('should reject invalid mood values', async () => {
      const invalidMoods = ['invalid', 'very-happy', 'super-sad', '', null, undefined];
      
      for (const invalidMood of invalidMoods) {
        const moodData = {
          userId,
          date: new Date(),
          mood: invalidMood,
          note: 'Invalid mood test'
        };

        const mood = new Mood(moodData);
        
        try {
          await mood.save();
          fail(`Should have thrown validation error for mood: ${invalidMood}`);
        } catch (error) {
          expect(error.name).toBe('ValidationError');
          expect(error.errors.mood).toBeDefined();
        }
      }
    });

    it('should set default value for note', async () => {
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy'
        // note not provided
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.note).toBe('');
    });

    it('should enforce note maxlength of 2000 characters', async () => {
      const longNote = 'a'.repeat(2001); // Exceeds limit
      
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: longNote
      };

      const mood = new Mood(moodData);
      
      try {
        await mood.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.note).toBeDefined();
        expect(error.errors.note.message).toContain('2000');
      }
    });

    it('should accept note at maxlength boundary', async () => {
      const maxNote = 'a'.repeat(2000); // Exactly at limit
      
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: maxNote
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.note).toBe(maxNote);
    });
  });

  describe('Indexes and Constraints', () => {
    it('should enforce unique constraint on userId and date combination', async () => {
      const moodData = {
        userId,
        date: new Date('2024-01-15'),
        mood: 'happy',
        note: 'First entry'
      };

      // Create first mood entry
      const firstMood = new Mood(moodData);
      await firstMood.save();

      // Try to create duplicate
      const duplicateMood = new Mood(moodData);
      
      try {
        await duplicateMood.save();
        fail('Should have thrown duplicate key error');
      } catch (error) {
        expect(error.code).toBe(11000); // MongoDB duplicate key error
      }
    });

    it('should allow same date for different users', async () => {
      // Create another user
      const otherUser = new User({
        email: 'other@example.com',
        password: 'hashedpassword123'
      });
      await otherUser.save();

      const sameDate = new Date('2024-01-15');
      
      const mood1 = new Mood({
        userId,
        date: sameDate,
        mood: 'happy',
        note: 'User 1 mood'
      });

      const mood2 = new Mood({
        userId: otherUser._id,
        date: sameDate,
        mood: 'sad',
        note: 'User 2 mood'
      });

      const savedMood1 = await mood1.save();
      const savedMood2 = await mood2.save();

      expect(savedMood1._id).toBeDefined();
      expect(savedMood2._id).toBeDefined();
      expect(savedMood1.userId.toString()).not.toBe(savedMood2.userId.toString());
    });

    it('should allow same user to have moods on different dates', async () => {
      const mood1 = new Mood({
        userId,
        date: new Date('2024-01-15'),
        mood: 'happy',
        note: 'Day 1'
      });

      const mood2 = new Mood({
        userId,
        date: new Date('2024-01-16'),
        mood: 'sad',
        note: 'Day 2'
      });

      const savedMood1 = await mood1.save();
      const savedMood2 = await mood2.save();

      expect(savedMood1._id).toBeDefined();
      expect(savedMood2._id).toBeDefined();
      expect(savedMood1.date.getTime()).not.toBe(savedMood2.date.getTime());
    });
  });

  describe('Pre-save Middleware', () => {
    it('should set createdAt and updatedAt on initial save', async () => {
      const beforeSave = new Date();
      
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: 'Test middleware'
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();
      
      const afterSave = new Date();

      expect(savedMood.createdAt).toBeDefined();
      expect(savedMood.updatedAt).toBeDefined();
      expect(savedMood.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedMood.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
      expect(savedMood.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedMood.updatedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it('should update updatedAt on subsequent saves', async () => {
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: 'Initial note'
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();
      
      const originalCreatedAt = savedMood.createdAt;
      const originalUpdatedAt = savedMood.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the mood
      savedMood.note = 'Updated note';
      const updatedMood = await savedMood.save();

      expect(updatedMood.createdAt.getTime()).toBe(originalCreatedAt.getTime());
      expect(updatedMood.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should update updatedAt even when no fields change', async () => {
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: 'Test note'
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();
      
      const originalUpdatedAt = savedMood.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Save without changes
      const reSavedMood = await savedMood.save();

      expect(reSavedMood.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Data Types and Conversions', () => {
    it('should handle string dates correctly', async () => {
      const moodData = {
        userId,
        date: '2024-01-15T10:30:00.000Z',
        mood: 'happy',
        note: 'String date test'
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.date).toBeInstanceOf(Date);
      expect(savedMood.date.toISOString()).toContain('2024-01-15');
    });

    it('should handle ObjectId for userId', async () => {
      const moodData = {
        userId: userId.toString(), // String representation
        date: new Date(),
        mood: 'happy',
        note: 'String userId test'
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(savedMood.userId.toString()).toBe(userId.toString());
    });

    it('should handle empty string note', async () => {
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: ''
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.note).toBe('');
    });

    it('should handle null note', async () => {
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: null
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.note).toBe(null);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create multiple mood entries for query testing
      const moods = [
        { userId, date: new Date('2024-01-10'), mood: 'happy', note: 'Day 1' },
        { userId, date: new Date('2024-01-11'), mood: 'sad', note: 'Day 2' },
        { userId, date: new Date('2024-01-12'), mood: 'excited', note: 'Day 3' },
        { userId, date: new Date('2024-01-13'), mood: 'neutral', note: 'Day 4' },
        { userId, date: new Date('2024-01-14'), mood: 'anxious', note: 'Day 5' }
      ];
      
      await Mood.insertMany(moods);
    });

    it('should find moods by userId', async () => {
      const moods = await Mood.find({ userId });
      expect(moods.length).toBe(5);
      moods.forEach(mood => {
        expect(mood.userId.toString()).toBe(userId.toString());
      });
    });

    it('should find moods by date range', async () => {
      const startDate = new Date('2024-01-11');
      const endDate = new Date('2024-01-13');
      
      const moods = await Mood.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      });

      expect(moods.length).toBe(3);
      expect(moods.map(m => m.mood)).toEqual(['sad', 'excited', 'neutral']);
    });

    it('should find moods by specific mood type', async () => {
      const happyMoods = await Mood.find({ userId, mood: 'happy' });
      expect(happyMoods.length).toBe(1);
      expect(happyMoods[0].mood).toBe('happy');
    });

    it('should sort moods by date descending', async () => {
      const moods = await Mood.find({ userId }).sort({ date: -1 });
      
      expect(moods.length).toBe(5);
      for (let i = 0; i < moods.length - 1; i++) {
        expect(moods[i].date.getTime()).toBeGreaterThanOrEqual(moods[i + 1].date.getTime());
      }
    });

    it('should limit query results', async () => {
      const moods = await Mood.find({ userId }).sort({ date: -1 }).limit(3);
      
      expect(moods.length).toBe(3);
      expect(moods[0].mood).toBe('anxious'); // Most recent
      expect(moods[2].mood).toBe('excited'); // Third most recent
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long valid notes', async () => {
      const longNote = 'This is a very long note. '.repeat(100); // ~2800 chars, but we'll truncate
      const truncatedNote = longNote.substring(0, 2000);
      
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: truncatedNote
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.note).toBe(truncatedNote);
      expect(savedMood.note.length).toBe(2000);
    });

    it('should handle special characters in notes', async () => {
      const specialNote = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: specialNote
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.note).toBe(specialNote);
    });

    it('should handle unicode characters in notes', async () => {
      const unicodeNote = 'Unicode: 🎉 😊 🌟 ñáéíóú 中文 日本語';
      
      const moodData = {
        userId,
        date: new Date(),
        mood: 'happy',
        note: unicodeNote
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      expect(savedMood.note).toBe(unicodeNote);
    });

    it('should handle leap year dates', async () => {
      // Use UTC to avoid timezone issues
      const leapYearDate = new Date(Date.UTC(2024, 1, 29)); // 2024 is a leap year, February 29
      
      const moodData = {
        userId,
        date: leapYearDate,
        mood: 'happy',
        note: 'Leap year test'
      };

      const mood = new Mood(moodData);
      const savedMood = await mood.save();

      // Check that the date is valid (February 29, 2024)
      expect(savedMood.date.getUTCFullYear()).toBe(2024);
      expect(savedMood.date.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(savedMood.date.getUTCDate()).toBe(29);
    });
  });
});
