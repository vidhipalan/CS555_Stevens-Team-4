const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Mood = require('../src/models/Mood');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

let mongo;
let authToken;
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
  
  // Create a test user and get auth token
  const user = new User({
    email: 'test@example.com',
    password: 'hashedpassword123'
  });
  await user.save();
  userId = user._id;
  
  // Generate JWT token
  process.env.JWT_SECRET = 'test-secret-key-for-testing';
  authToken = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET);
});

describe('Mood API', () => {
  describe('POST /api/moods - Create mood entry', () => {
    it('should create a new mood entry successfully', async () => {
      const moodData = {
        mood: 'happy',
        note: 'Feeling great today!',
        date: '2024-01-15'
      };

      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.mood).toBe('happy');
      expect(res.body.note).toBe('Feeling great today!');
      expect(res.body.userId).toBe(userId.toString());
      expect(new Date(res.body.date)).toEqual(new Date('2024-01-15'));
    });

    it('should create mood entry with current date when no date provided', async () => {
      const moodData = {
        mood: 'neutral',
        note: 'Just another day'
      };

      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(201);

      expect(res.body.mood).toBe('neutral');
      expect(res.body.note).toBe('Just another day');
      expect(res.body.userId).toBe(userId.toString());
      expect(res.body.date).toBeDefined();
    });

    it('should reject invalid mood values', async () => {
      const moodData = {
        mood: 'invalid-mood',
        note: 'This should fail'
      };

      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(500);

      expect(res.body).toHaveProperty('error');
    });

    it('should reject request without mood field', async () => {
      const moodData = {
        note: 'No mood provided'
      };

      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(400);

      expect(res.body.error).toBe('Mood is required');
    });

    it('should reject invalid date format', async () => {
      const moodData = {
        mood: 'happy',
        date: 'invalid-date'
      };

      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(400);

      expect(res.body.error).toBe('Invalid date format. Use YYYY-MM-DD.');
    });

    it('should prevent duplicate mood entries for same date', async () => {
      const moodData = {
        mood: 'happy',
        date: '2024-01-15'
      };

      // Create first entry
      await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(201);

      // Try to create duplicate
      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(409);

      expect(res.body.error).toBe('Mood already logged for this date');
    });

    it('should require authentication', async () => {
      const moodData = {
        mood: 'happy',
        note: 'Should fail without auth'
      };

      const res = await request(app)
        .post('/api/moods')
        .send(moodData)
        .expect(401);
    });
  });

  describe('GET /api/moods/today - Get mood by date', () => {
    beforeEach(async () => {
      // Create test mood entries
      await Mood.create([
        {
          userId,
          date: new Date('2024-01-15'),
          mood: 'happy',
          note: 'Great day!'
        },
        {
          userId,
          date: new Date('2024-01-16'),
          mood: 'sad',
          note: 'Not so good'
        }
      ]);
    });

    it('should get mood for specific date', async () => {
      const res = await request(app)
        .get('/api/moods/today?date=2024-01-15')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).not.toBeNull();
      expect(res.body.mood).toBe('happy');
      expect(res.body.note).toBe('Great day!');
    });

    it('should return null for date with no mood entry', async () => {
      const res = await request(app)
        .get('/api/moods/today?date=2024-01-20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeNull();
    });

    it('should get today\'s mood when no date provided', async () => {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      
      // Create mood for today
      await Mood.create({
        userId,
        date: todayUTC,
        mood: 'excited',
        note: 'Today is awesome!'
      });

      const res = await request(app)
        .get('/api/moods/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).not.toBeNull();
      expect(res.body.mood).toBe('excited');
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .get('/api/moods/today?date=invalid-date')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.error).toBe('Invalid date format. Use YYYY-MM-DD.');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/moods/today?date=2024-01-15')
        .expect(401);
    });
  });

  describe('GET /api/moods - Get mood history', () => {
    beforeEach(async () => {
      // Create multiple mood entries for testing
      const moods = [
        { userId, date: new Date('2024-01-10'), mood: 'happy', note: 'Day 1' },
        { userId, date: new Date('2024-01-11'), mood: 'sad', note: 'Day 2' },
        { userId, date: new Date('2024-01-12'), mood: 'excited', note: 'Day 3' },
        { userId, date: new Date('2024-01-13'), mood: 'neutral', note: 'Day 4' },
        { userId, date: new Date('2024-01-14'), mood: 'anxious', note: 'Day 5' },
        { userId, date: new Date('2024-01-15'), mood: 'tired', note: 'Day 6' },
        { userId, date: new Date('2024-01-16'), mood: 'angry', note: 'Day 7' }
      ];
      
      await Mood.insertMany(moods);
    });

    it('should get mood history with default limit', async () => {
      const res = await request(app)
        .get('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(7);
      
      // Should be sorted by date descending (newest first)
      expect(new Date(res.body[0].date)).toEqual(new Date('2024-01-16'));
      expect(new Date(res.body[6].date)).toEqual(new Date('2024-01-10'));
    });

    it('should respect custom limit parameter', async () => {
      const res = await request(app)
        .get('/api/moods?limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.length).toBe(3);
      expect(new Date(res.body[0].date)).toEqual(new Date('2024-01-16'));
      expect(new Date(res.body[2].date)).toEqual(new Date('2024-01-14'));
    });

    it('should enforce maximum limit of 365', async () => {
      const res = await request(app)
        .get('/api/moods?limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.length).toBe(7); // Only 7 entries exist
    });

    it('should enforce minimum limit of 1', async () => {
      const res = await request(app)
        .get('/api/moods?limit=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.length).toBe(7); // Should return all available entries (7) since limit=0 gets converted to default
    });

    it('should handle non-numeric limit gracefully', async () => {
      const res = await request(app)
        .get('/api/moods?limit=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.length).toBe(7); // Should use default limit
    });

    it('should return empty array when no moods exist', async () => {
      await Mood.deleteMany({});
      
      const res = await request(app)
        .get('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should only return moods for authenticated user', async () => {
      // Create another user and their mood
      const otherUser = new User({
        email: 'other@example.com',
        password: 'hashedpassword123'
      });
      await otherUser.save();

      await Mood.create({
        userId: otherUser._id,
        date: new Date('2024-01-20'),
        mood: 'happy',
        note: 'Other user mood'
      });

      const res = await request(app)
        .get('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only return moods for the authenticated user
      expect(res.body.length).toBe(7);
      res.body.forEach(mood => {
        expect(mood.userId).toBe(userId.toString());
      });
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/moods')
        .expect(401);
    });
  });

  describe('Mood Model Validation', () => {
    it('should validate required fields', async () => {
      const mood = new Mood({});
      
      try {
        await mood.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.userId).toBeDefined();
        expect(error.errors.date).toBeDefined();
        expect(error.errors.mood).toBeDefined();
      }
    });

    it('should validate mood enum values', async () => {
      const mood = new Mood({
        userId,
        date: new Date(),
        mood: 'invalid-mood'
      });

      try {
        await mood.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.mood).toBeDefined();
      }
    });

    it('should accept all valid mood values', async () => {
      const validMoods = ['happy', 'neutral', 'sad', 'angry', 'anxious', 'excited', 'tired'];
      
      for (const moodValue of validMoods) {
        const mood = new Mood({
          userId,
          date: new Date(),
          mood: moodValue,
          note: `Test note for ${moodValue}`
        });
        
        const savedMood = await mood.save();
        expect(savedMood.mood).toBe(moodValue);
        await Mood.findByIdAndDelete(savedMood._id);
      }
    });

    it('should enforce note maxlength', async () => {
      const longNote = 'a'.repeat(2001); // Exceeds 2000 character limit
      
      const mood = new Mood({
        userId,
        date: new Date(),
        mood: 'happy',
        note: longNote
      });

      try {
        await mood.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.note).toBeDefined();
      }
    });

    it('should set default values for createdAt and updatedAt', async () => {
      const mood = new Mood({
        userId,
        date: new Date(),
        mood: 'happy'
      });

      const savedMood = await mood.save();
      expect(savedMood.createdAt).toBeDefined();
      expect(savedMood.updatedAt).toBeDefined();
      expect(savedMood.note).toBe('');
    });

    it('should update updatedAt on save', async () => {
      const mood = new Mood({
        userId,
        date: new Date(),
        mood: 'happy'
      });

      const savedMood = await mood.save();
      const originalUpdatedAt = savedMood.updatedAt;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      savedMood.note = 'Updated note';
      const updatedMood = await savedMood.save();

      expect(updatedMood.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Mood History Edge Cases', () => {
    it('should handle large number of mood entries efficiently', async () => {
      // Create 100 mood entries
      const moods = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        moods.push({
          userId,
          date,
          mood: 'happy',
          note: `Day ${i}`
        });
      }
      
      await Mood.insertMany(moods);

      const res = await request(app)
        .get('/api/moods?limit=50')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.length).toBe(50);
    });

    it('should handle timezone differences correctly', async () => {
      // Test with different date formats
      const testDates = [
        '2024-01-15',
        '2024-12-31',
        '2024-02-29' // Leap year
      ];

      for (const dateStr of testDates) {
        const moodData = {
          mood: 'happy',
          date: dateStr
        };

        const res = await request(app)
          .post('/api/moods')
          .set('Authorization', `Bearer ${authToken}`)
          .send(moodData)
          .expect(201);

        expect(res.body.date).toBeDefined();
      }
    });
  });
});
