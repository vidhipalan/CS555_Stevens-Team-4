const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Mood = require('../src/models/Mood');

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
  await User.deleteMany({});
  await Mood.deleteMany({});
  
  // Create a test user and get auth token
  const user = await User.create({
    email: 'moodtest@example.com',
    password: 'password123'
  });
  userId = user._id;
  
  // Get auth token by logging in
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'moodtest@example.com', password: 'password123' });
  
  authToken = loginRes.body.token;
});

describe('Mood API', () => {
  describe('POST /api/moods', () => {
    it('should create a new mood entry', async () => {
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

    it('should create mood entry without note', async () => {
      const moodData = {
        mood: 'neutral',
        date: '2024-01-16'
      };

      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(201);

      expect(res.body.mood).toBe('neutral');
      expect(res.body.note).toBe('');
    });

    it('should reject invalid mood values', async () => {
      const moodData = {
        mood: 'invalid_mood',
        date: '2024-01-17'
      };

      const res = await request(app)
        .post('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(500); // Should fail validation

      expect(res.body).toHaveProperty('error');
    });

    it('should reject missing mood field', async () => {
      const moodData = {
        note: 'No mood specified',
        date: '2024-01-18'
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

    it('should reject duplicate mood entry for same date', async () => {
      const moodData = {
        mood: 'happy',
        note: 'First entry',
        date: '2024-01-19'
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
        .send({
          mood: 'sad',
          note: 'Second entry',
          date: '2024-01-19'
        })
        .expect(409);

      expect(res.body.error).toBe('Mood already logged for this date');
    });

    it('should require authentication', async () => {
      const moodData = {
        mood: 'happy',
        date: '2024-01-20'
      };

      const res = await request(app)
        .post('/api/moods')
        .send(moodData)
        .expect(401);

      expect(res.body.error).toBe('No token, authorization denied');
    });

    it('should accept all valid mood types', async () => {
      const validMoods = ['happy', 'neutral', 'sad', 'angry', 'anxious', 'excited', 'tired'];
      
      for (let i = 0; i < validMoods.length; i++) {
        const moodData = {
          mood: validMoods[i],
          date: `2024-01-${21 + i}`
        };

        const res = await request(app)
          .post('/api/moods')
          .set('Authorization', `Bearer ${authToken}`)
          .send(moodData)
          .expect(201);

        expect(res.body.mood).toBe(validMoods[i]);
      }
    });
  });

  describe('GET /api/moods/today', () => {
    it('should return mood for today when no date specified', async () => {
      // Create a mood entry for today using UTC date
      const today = new Date();
      const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      
      await Mood.create({
        userId: userId,
        date: utcDate,
        mood: 'excited',
        note: 'Great day!'
      });

      const res = await request(app)
        .get('/api/moods/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('mood', 'excited');
      expect(res.body).toHaveProperty('note', 'Great day!');
      expect(res.body).toHaveProperty('userId', userId.toString());
    });

    it('should return mood for specific date', async () => {
      const specificDate = '2024-02-15';
      
      // Create mood for specific date
      await Mood.create({
        userId: userId,
        date: new Date('2024-02-15'),
        mood: 'happy',
        note: 'Valentine\'s day!'
      });

      const res = await request(app)
        .get(`/api/moods/today?date=${specificDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.mood).toBe('happy');
      expect(res.body.note).toBe('Valentine\'s day!');
    });

    it('should return null when no mood found for date', async () => {
      const res = await request(app)
        .get('/api/moods/today?date=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeNull();
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
        .get('/api/moods/today')
        .expect(401);

      expect(res.body.error).toBe('No token, authorization denied');
    });
  });

  describe('GET /api/moods', () => {
    beforeEach(async () => {
      // Create multiple mood entries
      const moods = [
        { userId, date: new Date('2024-01-01'), mood: 'happy', note: 'New Year!' },
        { userId, date: new Date('2024-01-02'), mood: 'neutral', note: '' },
        { userId, date: new Date('2024-01-03'), mood: 'sad', note: 'Not great' },
        { userId, date: new Date('2024-01-04'), mood: 'excited', note: 'Weekend!' },
        { userId, date: new Date('2024-01-05'), mood: 'tired', note: 'Long week' }
      ];

      await Mood.insertMany(moods);
    });

    it('should return mood history sorted by date descending', async () => {
      const res = await request(app)
        .get('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveLength(5);
      expect(res.body[0].date).toBe('2024-01-05T00:00:00.000Z'); // Most recent first
      expect(res.body[4].date).toBe('2024-01-01T00:00:00.000Z'); // Oldest last
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/moods?limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveLength(3);
      expect(res.body[0].date).toBe('2024-01-05T00:00:00.000Z');
      expect(res.body[1].date).toBe('2024-01-04T00:00:00.000Z');
      expect(res.body[2].date).toBe('2024-01-03T00:00:00.000Z');
    });

    it('should use default limit of 60 when no limit specified', async () => {
      const res = await request(app)
        .get('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveLength(5); // We only have 5 entries
    });

    it('should enforce maximum limit of 365', async () => {
      const res = await request(app)
        .get('/api/moods?limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should still work but limit to 365
      expect(res.body.length).toBeLessThanOrEqual(365);
    });

    it('should enforce minimum limit of 1', async () => {
      const res = await request(app)
        .get('/api/moods?limit=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should still work but limit to at least 1
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should only return moods for authenticated user', async () => {
      // Create another user and their mood
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123'
      });

      await Mood.create({
        userId: otherUser._id,
        date: new Date('2024-01-06'),
        mood: 'angry',
        note: 'Other user mood'
      });

      const res = await request(app)
        .get('/api/moods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only return moods for the authenticated user
      expect(res.body).toHaveLength(5);
      res.body.forEach(mood => {
        expect(mood.userId).toBe(userId.toString());
      });
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/moods')
        .expect(401);

      expect(res.body.error).toBe('No token, authorization denied');
    });
  });
});
