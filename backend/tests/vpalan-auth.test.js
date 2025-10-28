const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Auth (vpalan4@stevens.edu)', () => {
  const testEmail = 'vpalan4@stevens.edu';
  const testPassword = 'vpalan@123';

  describe('signup', () => {
    it('creates account', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('patient'); // Default role
      expect(res.body.user).not.toHaveProperty('password');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('rejects duplicate email', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Email already registered');
    });

    it('hashes password', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      const user = await User.findOne({ email: testEmail });
      expect(user).toBeTruthy();
      expect(user.password).not.toBe(testPassword);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
      expect(user.email).toBe(testEmail);
      expect(user.role).toBe('patient');
    });

    it('sets createdAt', async () => {
      const beforeSignup = new Date();
      
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      const user = await User.findOne({ email: testEmail });
      const afterSignup = new Date();
      
      expect(user.createdAt).toBeTruthy();
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSignup.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterSignup.getTime());
    });

    it('accepts valid email format', async () => {
      const emailRegex = /^\S+@\S+\.\S+$/;
      expect(testEmail).toMatch(emailRegex);
      
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body.user.email).toBe(testEmail);
    });

    it('accepts password length >= 6', async () => {
      expect(testPassword.length).toBeGreaterThanOrEqual(6);
      
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body.user.email).toBe(testEmail);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword });
    });

    it('returns token + user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('patient');
      expect(res.body.user).not.toHaveProperty('password');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('is case-insensitive on email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'VPALAN4@STEVENS.EDU', password: testPassword })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testEmail); // Should be lowercase
    });

    it('issues working JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const token = res.body.token;
      expect(token).toBeTruthy();
      
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.user.email).toBe(testEmail);
      expect(meRes.body.user.role).toBe('patient');
    });

    it('allows repeated logins', async () => {
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res1.body.token).toBeTruthy();
      expect(res2.body.token).toBeTruthy();
      expect(res1.body.user.email).toBe(testEmail);
      expect(res2.body.user.email).toBe(testEmail);
    });

    it('requires email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: testPassword })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Please provide email and password');
    });

    it('requires password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Please provide email and password');
    });
  });

  describe('flow', () => {
    it('signup -> login -> me', async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(signupRes.body.token).toBeTruthy();
      expect(signupRes.body.user.email).toBe(testEmail);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(loginRes.body.token).toBeTruthy();
      expect(loginRes.body.user.email).toBe(testEmail);

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .expect(200);

      expect(meRes.body.user.email).toBe(testEmail);
      expect(meRes.body.user.role).toBe('patient');
      expect(meRes.body.user).not.toHaveProperty('password');
    });

    it('compares password correctly', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      const user = await User.findOne({ email: testEmail });
      const isMatch = await user.comparePassword(testPassword);
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('validates JWT and rejects invalid', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const token = loginRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.user.email).toBe(testEmail);

      // Invalid token should fail
      const invalidRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(invalidRes.body).toHaveProperty('error');
    });
  });

  describe('security', () => {
    it('never returns password', async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(signupRes.body.user).not.toHaveProperty('password');

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(loginRes.body.user).not.toHaveProperty('password');

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .expect(200);

      expect(meRes.body.user).not.toHaveProperty('password');
    });

    it('rejects obvious sql injection email', async () => {
      const maliciousEmail = "vpalan4@stevens.edu'; DROP TABLE users; --";
      
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: maliciousEmail, password: testPassword })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('does not echo raw password (xss)', async () => {
      const maliciousPassword = '<script>alert("xss")</script>';
      
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: maliciousPassword })
        .expect(201);

      const user = await User.findOne({ email: testEmail });
      expect(user.password).not.toContain('<script>');
      expect(user.password).toMatch(/^\$2[aby]\$/);
    });
  });
});
